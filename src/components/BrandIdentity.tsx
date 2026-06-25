import { cn } from "@/lib/utils";
import trustCorpLogo from "@/assets/trustcorp-logo.png";

type BrandIdentityProps = {
  variant?: "auth" | "sidebar" | "icon";
  className?: string;
};

export function BrandIdentity({ variant = "auth", className }: BrandIdentityProps) {
  const isAuth = variant === "auth";
  const isSidebar = variant === "sidebar";

  return (
    <div
      className={cn(
        "flex items-center",
        isAuth ? "flex-col gap-4 text-center" : "gap-3",
        className
      )}
    >
      <div
        className={cn(
          "shrink-0 overflow-hidden border border-emerald-100 bg-white shadow-sm",
          isAuth ? "h-24 w-24 rounded-[28px]" : "h-10 w-10 rounded-xl"
        )}
      >
        <img
          src={trustCorpLogo}
          alt="Logo Trust Corp"
          className="h-full w-full object-cover object-top scale-[1.12]"
          style={{ objectPosition: "center 10%" }}
        />
      </div>

      {variant !== "icon" && (
        <div className={cn(isAuth ? "space-y-1" : "space-y-0.5 leading-none")}>
          <p
            className={cn(
              "font-bold uppercase",
              isAuth
                ? "text-2xl tracking-[0.24em] text-slate-950 dark:text-slate-50"
                : "text-sm tracking-[0.18em] text-white"
            )}
          >
            Trust Corp
          </p>
          <p
            className={cn(
              isAuth ? "text-base text-slate-500 dark:text-slate-400" : "text-[11px] text-slate-300"
            )}
          >
            Financeiro
          </p>
        </div>
      )}
    </div>
  );
}
