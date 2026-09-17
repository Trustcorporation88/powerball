/**
 * Termo de uso e isenção de responsabilidade.
 *
 * O texto é versionado de propósito: o aceite fica gravado junto com a versão
 * que o usuário leu, então qualquer alteração de conteúdo exige subir
 * `TERMOS_VERSAO` e colher um novo aceite. Sem isso o registro não prova nada,
 * porque não dá para saber a que texto o usuário concordou.
 */

export interface TermoSecao {
  titulo: string;
  paragrafos: string[];
}

export const TERMOS_VERSAO = '1.0';
export const TERMOS_VIGENCIA = '17 de setembro de 2026';

/** Nome usado no texto legal e no cabeçalho do site. */
export const NOME_PLATAFORMA = 'Loterias Caixa • Powerball';

/**
 * Pontos que o usuário marca explicitamente antes de liberar o acesso.
 * São os que realmente importam se alguém vier reclamar de prejuízo.
 */
export const TERMOS_PONTOS_CRITICOS = [
  'Entendo que este site é uma ferramenta de sugestão e análise estatística, e que NENHUM palpite, estratégia, fechamento ou pontuação aumenta minha chance de ser premiado.',
  'Entendo que não existe garantia de prêmio de qualquer espécie, e que o resultado mais provável de qualquer aposta é a perda do valor apostado.',
  'Entendo que este site não tem vínculo com a Caixa Econômica Federal, não recebe apostas nem valores, e que a aposta só é válida quando registrada nos canais oficiais.',
  'Declaro ser maior de 18 anos e assumo como exclusivamente minha a responsabilidade pelas apostas que eu decidir fazer e pelos valores que eu gastar.',
];

export const TERMOS_SECOES: TermoSecao[] = [
  {
    titulo: '1. O que é este site',
    paragrafos: [
      `O ${NOME_PLATAFORMA} é uma ferramenta particular de apoio à escolha de dezenas para as loterias operadas pela Caixa Econômica Federal. Ele reúne histórico de concursos, estatísticas descritivas, geradores de combinações e sistemas de fechamento combinatório.`,
      'Todo o conteúdo tem finalidade informativa, analítica e de entretenimento. Nada aqui constitui aconselhamento financeiro, de investimento, jurídico ou de qualquer outra natureza profissional.',
    ],
  },
  {
    titulo: '2. Ausência de vínculo com a Caixa Econômica Federal',
    paragrafos: [
      'Este site é independente e não possui qualquer vínculo, patrocínio, convênio, credenciamento, autorização ou relação societária com a Caixa Econômica Federal, com as Loterias Caixa ou com qualquer órgão público.',
      'As marcas, nomes e logotipos das modalidades lotéricas pertencem aos seus respectivos titulares e são citados aqui apenas para identificar a modalidade a que cada análise se refere.',
    ],
  },
  {
    titulo: '3. Nenhuma garantia de prêmio',
    paragrafos: [
      'Loterias são jogos de azar. Cada sorteio é um evento independente e aleatório, e todas as combinações válidas têm exatamente a mesma probabilidade de serem sorteadas.',
      'Nenhuma estatística, estratégia, pontuação, mapa de calor, sugestão ou ferramenta deste site aumenta a probabilidade de acerto. Dezena atrasada não tem prêmio "guardado" para sair, e dezena frequente não tem tendência de continuar saindo.',
      'As pontuações de 0 a 100 exibidas nos bilhetes medem apenas o quanto uma combinação se parece com o perfil estatístico dos sorteios já realizados. Uma combinação com pontuação 100 e uma com pontuação 10 têm rigorosamente a mesma chance de serem sorteadas.',
      'As garantias apresentadas nos fechamentos são estritamente matemáticas e condicionais: elas só se aplicam se as dezenas sorteadas estiverem dentro do grupo previamente escolhido pelo usuário, na quantidade descrita em cada plano. Não são, em nenhuma hipótese, garantia de premiação.',
      'O resultado mais provável de qualquer aposta, em qualquer modalidade, é a perda integral do valor apostado.',
    ],
  },
  {
    titulo: '4. O site não recebe apostas nem valores',
    paragrafos: [
      'Este site não é casa lotérica, não é agente credenciado e não intermedeia apostas. Ele não recebe, não movimenta e não custodia dinheiro de usuários, a qualquer título.',
      'As apostas só têm validade quando registradas diretamente nos canais oficiais da Caixa Econômica Federal: unidades lotéricas credenciadas, aplicativo oficial ou portal oficial de loterias. Os bilhetes gerados aqui são apenas sugestões de dezenas a serem apostadas por conta e risco do usuário nesses canais.',
      'O site também não paga, não intermedeia e não tem qualquer responsabilidade sobre eventuais prêmios, cuja conferência e pagamento competem exclusivamente à Caixa Econômica Federal.',
    ],
  },
  {
    titulo: '5. Resultados e dados exibidos',
    paragrafos: [
      'Os resultados de concursos exibidos são obtidos de fontes públicas e podem conter erros, atrasos, falhas de sincronização ou indisponibilidade temporária.',
      'A conferência automática de bilhetes oferecida pelo site é uma conveniência e não substitui a conferência oficial. O único resultado válido é o divulgado pela Caixa Econômica Federal.',
      'O usuário deve sempre confirmar acertos e premiações nos canais oficiais antes de tomar qualquer decisão.',
    ],
  },
  {
    titulo: '6. Responsabilidade do usuário',
    paragrafos: [
      'A decisão de apostar, o que apostar, quanto apostar e com que frequência apostar é exclusiva do usuário. O site apenas apresenta sugestões e análises solicitadas por ele.',
      'O usuário declara ser maior de 18 anos, conforme exigido pela legislação brasileira para participação em loterias.',
      'O usuário é o único responsável pelos valores que gasta e pelas consequências financeiras, pessoais ou familiares decorrentes das suas apostas.',
      'Os recursos de bolão oferecidos pelo site são meramente organizacionais, de cálculo e de registro. Qualquer acordo entre cotistas é particular entre eles, e o site não é parte, garantidor, administrador, fiador ou testemunha dessa relação.',
    ],
  },
  {
    titulo: '7. Limitação de responsabilidade',
    paragrafos: [
      'O site é fornecido no estado em que se encontra, sem garantia de funcionamento ininterrupto, de ausência de erros ou de adequação a qualquer finalidade específica.',
      'Na máxima extensão permitida pela legislação aplicável, ficam excluídas quaisquer responsabilidades do titular deste site por perdas, danos diretos ou indiretos, lucros cessantes, prejuízos financeiros, perda de dados ou de oportunidade de premiação decorrentes do uso ou da impossibilidade de uso da ferramenta, inclusive nos casos de erro de cálculo, falha de dados, indisponibilidade ou interpretação equivocada das informações apresentadas.',
      'O usuário concorda que utiliza a ferramenta por sua livre e exclusiva escolha, ciente de todos os riscos descritos neste termo.',
    ],
  },
  {
    titulo: '8. Jogo responsável',
    paragrafos: [
      'Aposte apenas valores cuja perda total não comprometa o seu orçamento. O site oferece controle de limite mensal de gastos justamente para ajudar nisso, mas a decisão final é sempre do usuário.',
      'Jogo pode causar dependência. Se as apostas estiverem afetando suas finanças, seu trabalho ou suas relações pessoais, procure ajuda profissional ou grupos de apoio a jogadores compulsivos.',
    ],
  },
  {
    titulo: '9. Registro deste aceite e dados pessoais',
    paragrafos: [
      'Para comprovar a ciência do usuário quanto a estas condições, o aceite é registrado vinculado à conta utilizada, com data e hora, versão do texto aceito e dados técnicos da requisição, como endereço IP e identificação do navegador.',
      'Esse registro é tratado com base no legítimo interesse de comprovação da relação de uso e no cumprimento de obrigações legais, nos termos da Lei nº 13.709/2018 (LGPD), e é conservado enquanto a conta existir.',
      'Os demais dados fornecidos, como nome e e-mail, são utilizados exclusivamente para autenticação e funcionamento das ferramentas do site, não sendo comercializados nem compartilhados com terceiros para fins publicitários.',
    ],
  },
  {
    titulo: '10. Alterações',
    paragrafos: [
      'Este termo pode ser alterado a qualquer momento. Sempre que o texto for modificado, sua versão será atualizada e um novo aceite será solicitado antes da continuidade do uso.',
      'O uso continuado após um novo aceite significa concordância integral com a versão vigente.',
    ],
  },
  {
    titulo: '11. Legislação aplicável',
    paragrafos: [
      'Este termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro do domicílio do titular deste site para dirimir quaisquer controvérsias dele decorrentes, salvo disposição legal em sentido contrário.',
    ],
  },
];

/** Aviso curto para rodapés e páginas públicas. */
export const AVISO_CURTO =
  'Site independente, sem vínculo com a Caixa Econômica Federal. Ferramenta de análise estatística e sugestão de dezenas: não garante prêmio de qualquer espécie, não recebe apostas e não intermedeia valores. Apostas somente nos canais oficiais. Proibido para menores de 18 anos.';
