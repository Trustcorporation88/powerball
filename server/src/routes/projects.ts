import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authGuard } from "../auth.js";

function toDate(value: unknown): Date | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return undefined;
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function serializeProject(project: {
  id: string;
  name: string;
  segment: string;
  status: string;
  createdAt: Date;
  lastProcessed: Date | null;
}) {
  return {
    id: project.id,
    name: project.name,
    segment: project.segment,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    lastProcessed: project.lastProcessed ? project.lastProcessed.toISOString() : undefined,
  };
}

async function getOwnedProject(
  request: FastifyRequest,
  reply: FastifyReply,
  projectId: string,
): Promise<boolean> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== request.user.id) {
    await reply.code(404).send({ message: "Projeto não encontrado" });
    return false;
  }
  return true;
}

const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  segment: z.string().default(""),
  status: z.enum(["active", "processing", "error"]).default("active"),
  createdAt: z.string().optional(),
  lastProcessed: z.string().optional().nullable(),
});

const fileSchema = z.object({
  name: z.string(),
  sheets: z.array(z.any()).default([]),
  selectedSheet: z.string().default(""),
  selectedSheets: z.array(z.string()).optional(),
  importMode: z.enum(["single", "combine"]).optional(),
  headers: z.array(z.any()).default([]),
  preview: z.array(z.any()).default([]),
  allData: z.array(z.any()).default([]),
});

const mappingSchema = z.object({
  originalName: z.string(),
  detectedType: z.string().default(""),
  confirmedType: z.string().default(""),
  financialRole: z.string().default(""),
});

const transactionSchema = z.object({
  id: z.string().optional(),
  date: z.string().default(""),
  description: z.string().default(""),
  category: z.string().default(""),
  dreGroup: z.string().optional().nullable(),
  dreOriginalGroup: z.string().optional().nullable(),
  subcategory: z.string().default(""),
  account: z.string().default(""),
  costCenter: z.string().default(""),
  unit: z.string().default(""),
  value: z.number().default(0),
  currency: z.string().default("BRL"),
  flowType: z.enum(["income", "expense"]),
});

const dreRuleSchema = z.object({
  id: z.string().min(1),
  field: z.string(),
  operator: z.string(),
  value: z.string(),
  dreGroup: z.string(),
  priority: z.number().default(0),
  createdAt: z.string().optional(),
});

const layoutSchema = z.object({
  name: z.string().default("Layout"),
  layout: z.any(),
});

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authGuard);

  app.get("/projects", async (request) => {
    const projects = await prisma.project.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: "desc" },
    });
    return projects.map(serializeProject);
  });

  app.post("/projects", async (request, reply) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const data = parsed.data;
    const existing = await prisma.project.findUnique({ where: { id: data.id } });
    if (existing && existing.userId !== request.user.id) {
      return reply.code(409).send({ message: "ID de projeto já utilizado" });
    }

    const project = await prisma.project.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        userId: request.user.id,
        name: data.name,
        segment: data.segment,
        status: data.status,
        createdAt: toDate(data.createdAt) ?? new Date(),
        lastProcessed: toDate(data.lastProcessed ?? undefined) ?? null,
      },
      update: {
        name: data.name,
        segment: data.segment,
        status: data.status,
        lastProcessed: toDate(data.lastProcessed ?? undefined) ?? null,
      },
    });

    return reply.send(serializeProject(project));
  });

  app.delete<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    await prisma.project.delete({ where: { id: request.params.id } });
    return reply.send({ success: true });
  });

  app.get<{ Params: { id: string } }>("/projects/:id/file", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const file = await prisma.fileData.findUnique({ where: { projectId: request.params.id } });
    if (!file) return reply.send(null);
    return reply.send({
      name: file.name,
      sheets: file.sheets,
      selectedSheet: file.selectedSheet,
      selectedSheets: file.selectedSheets,
      importMode: file.importMode ?? undefined,
      headers: file.headers,
      preview: file.preview,
      allData: file.allData,
    });
  });

  app.put<{ Params: { id: string } }>("/projects/:id/file", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const parsed = fileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }
    const data = parsed.data;
    const payload = {
      name: data.name,
      sheets: data.sheets as Prisma.InputJsonValue,
      selectedSheet: data.selectedSheet,
      selectedSheets: (data.selectedSheets ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      importMode: data.importMode ?? null,
      headers: data.headers as Prisma.InputJsonValue,
      preview: data.preview as Prisma.InputJsonValue,
      allData: data.allData as Prisma.InputJsonValue,
    };
    await prisma.fileData.upsert({
      where: { projectId: request.params.id },
      create: { projectId: request.params.id, ...payload },
      update: payload,
    });
    return reply.send({ success: true });
  });

  app.get<{ Params: { id: string } }>("/projects/:id/mappings", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const mappings = await prisma.columnMapping.findMany({ where: { projectId: request.params.id } });
    return reply.send(
      mappings.map((m) => ({
        originalName: m.originalName,
        detectedType: m.detectedType,
        confirmedType: m.confirmedType,
        financialRole: m.financialRole,
      })),
    );
  });

  app.put<{ Params: { id: string } }>("/projects/:id/mappings", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const parsed = z.array(mappingSchema).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Mapeamentos inválidos" });
    }
    const projectId = request.params.id;
    await prisma.$transaction([
      prisma.columnMapping.deleteMany({ where: { projectId } }),
      prisma.columnMapping.createMany({
        data: parsed.data.map((m) => ({ ...m, projectId })),
      }),
    ]);
    return reply.send({ success: true });
  });

  app.get<{ Params: { id: string } }>("/projects/:id/transactions", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const transactions = await prisma.transaction.findMany({ where: { projectId: request.params.id } });
    return reply.send(
      transactions.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        dreGroup: t.dreGroup ?? undefined,
        dreOriginalGroup: t.dreOriginalGroup ?? undefined,
        subcategory: t.subcategory,
        account: t.account,
        costCenter: t.costCenter,
        unit: t.unit,
        value: t.value,
        currency: t.currency,
        flowType: t.flowType as "income" | "expense",
      })),
    );
  });

  app.put<{ Params: { id: string } }>("/projects/:id/transactions", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const parsed = z.array(transactionSchema).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Transações inválidas" });
    }
    const projectId = request.params.id;
    const rows = parsed.data.map((t, index) => {
      const scopedId = t.id?.startsWith(`${projectId}::`)
        ? t.id
        : `${projectId}::${t.id ?? index}`;
      return {
        id: scopedId,
        projectId,
        date: t.date,
        description: t.description,
        category: t.category,
        dreGroup: t.dreGroup ?? null,
        dreOriginalGroup: t.dreOriginalGroup ?? null,
        subcategory: t.subcategory,
        account: t.account,
        costCenter: t.costCenter,
        unit: t.unit,
        value: t.value,
        currency: t.currency,
        flowType: t.flowType,
      };
    });
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { projectId } }),
      prisma.transaction.createMany({ data: rows, skipDuplicates: true }),
    ]);
    return reply.send({ success: true });
  });

  app.get<{ Params: { id: string } }>("/projects/:id/dre-rules", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const rules = await prisma.dRERule.findMany({
      where: { projectId: request.params.id },
      orderBy: { priority: "asc" },
    });
    return reply.send(
      rules.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        field: r.field,
        operator: r.operator,
        value: r.value,
        dreGroup: r.dreGroup,
        priority: r.priority,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  });

  app.put<{ Params: { id: string } }>("/projects/:id/dre-rules", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const parsed = z.array(dreRuleSchema).safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Regras de DRE inválidas" });
    }
    const projectId = request.params.id;
    await prisma.$transaction([
      prisma.dRERule.deleteMany({ where: { projectId } }),
      prisma.dRERule.createMany({
        data: parsed.data.map((r) => ({
          id: r.id,
          projectId,
          field: r.field,
          operator: r.operator,
          value: r.value,
          dreGroup: r.dreGroup,
          priority: r.priority,
          createdAt: toDate(r.createdAt) ?? new Date(),
        })),
      }),
    ]);
    return reply.send({ success: true });
  });

  app.get<{ Params: { id: string } }>("/projects/:id/layout", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const layout = await prisma.dashboardLayout.findUnique({ where: { projectId: request.params.id } });
    if (!layout) return reply.send(null);
    return reply.send({ projectId: layout.projectId, name: layout.name, layout: layout.layout });
  });

  app.put<{ Params: { id: string } }>("/projects/:id/layout", async (request, reply) => {
    if (!(await getOwnedProject(request, reply, request.params.id))) return;
    const parsed = layoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Layout inválido" });
    }
    const projectId = request.params.id;
    const payload = {
      name: parsed.data.name,
      layout: parsed.data.layout as Prisma.InputJsonValue,
    };
    await prisma.dashboardLayout.upsert({
      where: { projectId },
      create: { projectId, ...payload },
      update: payload,
    });
    return reply.send({ success: true });
  });
}
