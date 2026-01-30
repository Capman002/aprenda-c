export type QuizScope = "topic" | "module";

export type CodeBoxSpec = {
  title?: string;
  initialCode: string;
};

type BaseQuizQuestion = {
  id: string;
  prompt: string;
  explanation: string;
  shortExplanation?: string;
  hint?: string;
  codeBox?: CodeBoxSpec;
  scored?: boolean;
};

export type QuizQuestion =
  | (BaseQuizQuestion & {
      type: "single_choice";
      options: string[];
      correctIndex: number;
    })
  | (BaseQuizQuestion & {
      type: "numeric";
      answer: number;
    })
  | (BaseQuizQuestion & {
      type: "practice";
    });

const singleChoice = (
  id: string,
  prompt: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  codeBox?: CodeBoxSpec,
): QuizQuestion => ({
  id,
  type: "single_choice",
  prompt,
  options,
  correctIndex,
  explanation,
  ...(codeBox ? { codeBox } : {}),
});

const practiceQuestion = (
  id: string,
  prompt: string,
  explanation: string,
  codeBox: CodeBoxSpec,
): QuizQuestion => ({
  id,
  type: "practice",
  prompt,
  explanation,
  codeBox,
  scored: false,
});

const numericQuestion = (
  id: string,
  prompt: string,
  answer: number,
  explanation: string,
  codeBox?: CodeBoxSpec,
): QuizQuestion => ({
  id,
  type: "numeric",
  prompt,
  answer,
  explanation,
  ...(codeBox ? { codeBox } : {}),
});

const topicQuizIdBySlug: Record<string, string> = {
  "fundamentos-computacao/introducao-programacao": "m02_t00_intro",
  "fundamentos-computacao/binario": "m02_t01_binario",
  "fundamentos-computacao/processadores": "m02_t02_processadores",
  "fundamentos-computacao/hexadecimal": "m02_t03_hexadecimal",
};

const moduleExamIdByNumber: Record<string, string> = {
  "02": "m02_exam",
};

export interface QuizDefinition {
  id: string;
  title: string;
  scope: QuizScope;
  passingScore?: number;
  questions: QuizQuestion[];
}

export const quizzes: Record<string, QuizDefinition> = {
  m02_t00_intro: {
    id: "m02_t00_intro",
    title: "Checkpoint — Introdução à Programação",
    scope: "topic",
    questions: [
      {
        id: "q1",
        type: "single_choice",
        prompt: "Qual definição descreve melhor um algoritmo?",
        options: [
          "Um conjunto de comandos em C que compila sem erros",
          "Uma sequência finita de passos bem definidos para resolver um problema",
          "Um programa que roda no sistema operacional",
          "Um arquivo .exe gerado após o build",
        ],
        correctIndex: 1,
        explanation:
          "Algoritmo é a ideia/receita: passos finitos e claros para resolver um problema, independente da linguagem.",
      },
      {
        id: "q2",
        type: "single_choice",
        prompt: "Qual opção exemplifica erro de lógica (e não de sintaxe)?",
        options: [
          "Faltou ponto e vírgula e o código não compila",
          "A variável foi declarada com tipo inexistente e o compilador reclama",
          "O programa compila, executa, mas entrega resultado incorreto",
          "Um #include está faltando e o linker falha",
        ],
        correctIndex: 2,
        explanation:
          "Erro de lógica é quando o programa roda, mas resolve o problema errado (ou parcialmente).",
      },
      {
        id: "q3",
        type: "single_choice",
        prompt:
          "No pensamento computacional, qual conjunto de habilidades é o mais correto?",
        options: [
          "Compilar, linkar, debugar, versionar",
          "Decompor, reconhecer padrões, abstrair, projetar algoritmos",
          "Memorizar sintaxe, copiar código, usar IA, rodar testes",
          "Escolher framework, escrever CSS, publicar em produção",
        ],
        correctIndex: 1,
        explanation:
          "O núcleo do pensamento computacional é decomposição, padrões, abstração e algoritmos.",
      },
    ],
  },

  m02_t01_binario: {
    id: "m02_t01_binario",
    title: "Checkpoint — Sistema Binário",
    scope: "topic",
    questions: [
      {
        id: "q1",
        type: "numeric",
        prompt:
          "Quantos valores diferentes um byte (8 bits) sem sinal consegue representar?",
        answer: 256,
        explanation: "2^8 = 256 valores (0 a 255).",
      },
      {
        id: "q2",
        type: "single_choice",
        prompt: "Por que binário é usado em hardware digital?",
        options: [
          "Porque é mais bonito para humanos",
          "Porque distinguir 2 níveis de tensão é mais robusto do que muitos níveis",
          "Porque permite números maiores do que decimal",
          "Porque CPUs não conseguem fazer aritmética decimal",
        ],
        correctIndex: 1,
        explanation:
          "Fisicamente, dois estados (alto/baixo) são muito mais tolerantes a ruído do que múltiplos níveis.",
      },
      {
        id: "q3",
        type: "single_choice",
        prompt:
          "Em complemento de dois (8 bits), qual é a faixa de valores para números com sinal?",
        options: ["0 a 255", "-255 a 255", "-128 a 127", "-127 a 128"],
        correctIndex: 2,
        explanation: "Com 8 bits em complemento de dois: -128 a +127.",
      },
    ],
  },

  m02_t02_processadores: {
    id: "m02_t02_processadores",
    title: "Checkpoint — Como Processadores Funcionam",
    scope: "topic",
    questions: [
      {
        id: "q1",
        type: "single_choice",
        prompt: "O que o Program Counter (PC) faz?",
        options: [
          "Armazena o resultado da última operação da ALU",
          "Aponta para a próxima instrução a ser buscada/executada",
          "Guarda o estado do cache L1",
          "Controla a tensão do clock",
        ],
        correctIndex: 1,
        explanation:
          "O PC (ou Instruction Pointer) aponta para a próxima instrução na memória.",
      },
      {
        id: "q2",
        type: "single_choice",
        prompt: "Qual é a memória mais rápida, em geral?",
        options: ["SSD", "RAM", "Cache L3", "Registradores"],
        correctIndex: 3,
        explanation:
          "Registradores ficam dentro da CPU e são a forma mais rápida de armazenamento acessível pela execução.",
      },
      {
        id: "q3",
        type: "single_choice",
        prompt:
          "Por que branch prediction e padrões previsíveis impactam performance?",
        options: [
          "Porque o compilador substitui branches por instruções mágicas",
          "Porque a CPU tenta adivinhar o caminho e erra custa ciclos (pipeline flush)",
          "Porque branches sempre invalidam o cache",
          "Porque branches impedem paralelismo em qualquer cenário",
        ],
        correctIndex: 1,
        explanation:
          "Erros de predição geram bolhas no pipeline e desperdiçam trabalho especulativo.",
      },
    ],
  },

  m02_t03_hexadecimal: {
    id: "m02_t03_hexadecimal",
    title: "Checkpoint — Sistema Hexadecimal",
    scope: "topic",
    questions: [
      {
        id: "q1",
        type: "numeric",
        prompt: "Converta 0xAC para decimal.",
        answer: 172,
        explanation: "0xAC = 10*16 + 12 = 160 + 12 = 172.",
      },
      {
        id: "q2",
        type: "single_choice",
        prompt: "Por que hexadecimal é tão usado em endereços de memória?",
        options: [
          "Porque é base 10 e fácil para humanos",
          "Porque cada dígito representa 4 bits, compactando o binário",
          "Porque evita overflow em CPU",
          "Porque é o formato interno real da RAM",
        ],
        correctIndex: 1,
        explanation:
          "1 dígito hex = 4 bits. Isso torna dumps e endereços legíveis sem perder relação com bits.",
      },
      {
        id: "q3",
        type: "single_choice",
        prompt: "Em C, qual format specifier imprime hexadecimal em maiúsculo?",
        options: ["%x", "%X", "%h", "%hex"],
        correctIndex: 1,
        explanation: "%X imprime hexadecimal em letras maiúsculas (A-F).",
        codeBox: {
          title: "Teste rápido (C)",
          initialCode:
            '#include <stdio.h>\n\nint main(void) {\n  int n = 0xAC;\n  printf("lower: %x\\n", n);\n  printf("upper: %X\\n", n);\n  return 0;\n}\n',
        },
      },
    ],
  },

  m02_exam: {
    id: "m02_exam",
    title: "Prova do Módulo 02 — Fundamentos de Computação",
    scope: "module",
    passingScore: 0.7,
    questions: (() => {
      const intro: QuizQuestion[] = [
        singleChoice(
          "q1",
          "Qual definição descreve melhor um algoritmo?",
          [
            "Um conjunto de comandos que compila sem erros",
            "Uma sequência finita de passos bem definidos para resolver um problema",
            "Um programa já pronto em C",
            "Um arquivo binário gerado após o build",
          ],
          1,
          "Algoritmo é a receita: passos finitos e claros para resolver um problema, independente da linguagem.",
        ),
        singleChoice(
          "q2",
          "Por que decompor um problema em partes menores ajuda na resolução?",
          [
            "Porque elimina a necessidade de algoritmos",
            "Porque pequenos subproblemas ficam mais fáceis de entender e resolver",
            "Porque permite ignorar requisitos",
            "Porque substitui a necessidade de testes",
          ],
          1,
          "Dividir em subproblemas reduz complexidade cognitiva e facilita validar cada parte.",
        ),
      ];

      const binary: QuizQuestion[] = [
        numericQuestion(
          "q3",
          "Quantos valores diferentes um byte (8 bits) sem sinal pode representar?",
          256,
          "2^8 = 256 valores (0 a 255).",
        ),
        singleChoice(
          "q4",
          "Por que hardware digital usa binário?",
          [
            "Porque é base 10",
            "Porque distinguir 2 níveis de tensão é mais robusto que vários níveis",
            "Porque CPUs não suportam decimal",
            "Porque é mais legível para humanos",
          ],
          1,
          "Dois estados (alto/baixo) são mais tolerantes a ruído e baratos de implementar fisicamente.",
        ),
        singleChoice(
          "q5",
          "Qual é a faixa de valores de um inteiro com sinal em complemento de dois, com 8 bits?",
          ["-255 a 255", "-128 a 127", "0 a 255", "-127 a 128"],
          1,
          "Em complemento de dois de 8 bits: -128 a +127.",
        ),
      ];

      const processors: QuizQuestion[] = [
        singleChoice(
          "q6",
          "Qual sequência descreve corretamente o ciclo básico da CPU?",
          [
            "Execute → Decode → Fetch",
            "Fetch → Decode → Execute",
            "Decode → Fetch → Execute",
            "Fetch → Execute → Decode",
          ],
          1,
          "O ciclo clássico é Fetch, depois Decode, depois Execute.",
        ),
        singleChoice(
          "q7",
          "O que o Program Counter (PC) faz?",
          [
            "Armazena o resultado da última operação da ALU",
            "Aponta para a próxima instrução a ser buscada/executada",
            "Guarda o estado do cache L1",
            "Controla a tensão do clock",
          ],
          1,
          "O PC aponta para a próxima instrução na memória.",
        ),
        singleChoice(
          "q8",
          "Por que cache miss é caro?",
          [
            "Porque RAM é muito mais lenta que registradores/cache",
            "Porque cache é opcional",
            "Porque sempre invalida o programa",
            "Porque só ocorre em SSD",
          ],
          0,
          "Buscar na RAM tem latência alta comparado a registradores/cache.",
        ),
      ];

      const hex: QuizQuestion[] = [
        singleChoice(
          "q9",
          "Por que hexadecimal é usado em endereços e dumps de memória?",
          [
            "Porque é base 10",
            "Porque cada dígito representa 4 bits, compactando o binário",
            "Porque evita overflow em CPU",
            "Porque é o formato interno real da RAM",
          ],
          1,
          "1 dígito hex = 4 bits, deixando endereços e dumps legíveis sem perder a relação com bits.",
        ),
        numericQuestion(
          "q10",
          "Converta 0xAC para decimal.",
          172,
          "0xAC = 10*16 + 12 = 172.",
        ),
        practiceQuestion(
          "q11",
          "Desafio prático: imprima 255 em hexadecimal (maiúsculo)",
          "Use %X no printf para imprimir hexadecimal em maiúsculo.",
          {
            title: "Imprima 255 em hexadecimal (maiúsculo)",
            initialCode:
              "#include <stdio.h>\n\nint main(void) {\n    int x = 255;\n\n    // TODO: imprima em HEX (maiúsculo)\n\n    return 0;\n}\n",
          },
        ),
      ];

      return [...intro, ...binary, ...processors, ...hex];
    })(),
  },
};

const isDev =
  typeof import.meta !== "undefined" && !!(import.meta as any).env?.DEV;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const deepFreeze = <T>(value: T): T => {
  if (!value || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;

  Object.freeze(value);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }

  return value;
};

type QuizCatalogConfig = {
  topicQuizIdBySlug: Readonly<Record<string, string>>;
  moduleExamIdByNumber: Readonly<Record<string, string>>;
};

class QuizCatalog {
  public readonly quizzes: Record<string, QuizDefinition>;
  private readonly topicQuizIdBySlug: QuizCatalogConfig["topicQuizIdBySlug"];
  private readonly moduleExamIdByNumber: QuizCatalogConfig["moduleExamIdByNumber"];

  public constructor(
    raw: Record<string, QuizDefinition>,
    config: QuizCatalogConfig,
  ) {
    this.quizzes = raw;
    this.topicQuizIdBySlug = config.topicQuizIdBySlug;
    this.moduleExamIdByNumber = config.moduleExamIdByNumber;
    if (isDev) this.validate();
  }

  public getTopicQuizId(topicSlug: string): string | undefined {
    return this.topicQuizIdBySlug[topicSlug];
  }

  public getModuleExamId(moduleNumber: string): string | undefined {
    return this.moduleExamIdByNumber[moduleNumber];
  }

  private validate(): void {
    for (const [id, quiz] of Object.entries(this.quizzes)) {
      assert(quiz.id === id, `quizBank: quiz.id inconsistente para ${id}`);
      assert(
        Array.isArray(quiz.questions),
        `quizBank: quiz.questions inválido para ${id}`,
      );
      assert(quiz.questions.length > 0, `quizBank: quiz sem questões: ${id}`);

      const questionIds = new Set<string>();
      for (const q of quiz.questions) {
        assert(
          !questionIds.has(q.id),
          `quizBank: questão duplicada ${id}:${q.id}`,
        );
        questionIds.add(q.id);

        if (q.type === "single_choice") {
          assert(
            Array.isArray(q.options) && q.options.length >= 2,
            `quizBank: opções inválidas ${id}:${q.id}`,
          );
          assert(
            Number.isInteger(q.correctIndex) &&
              q.correctIndex >= 0 &&
              q.correctIndex < q.options.length,
            `quizBank: correctIndex fora do intervalo ${id}:${q.id}`,
          );
        }

        if (q.type === "numeric") {
          assert(
            typeof q.answer === "number" && Number.isFinite(q.answer),
            `quizBank: answer inválido ${id}:${q.id}`,
          );
        }

        if (q.type === "practice") {
          assert(
            typeof q.codeBox !== "undefined",
            `quizBank: questão prática sem codeBox ${id}:${q.id}`,
          );
        }

        if (typeof q.shortExplanation !== "undefined") {
          assert(
            typeof q.shortExplanation === "string",
            `quizBank: shortExplanation inválido ${id}:${q.id}`,
          );
        }

        if (typeof q.hint !== "undefined") {
          assert(
            typeof q.hint === "string",
            `quizBank: hint inválido ${id}:${q.id}`,
          );
        }

        if (typeof q.codeBox !== "undefined") {
          assert(
            typeof q.codeBox.initialCode === "string" &&
              q.codeBox.initialCode.trim() !== "",
            `quizBank: codeBox.initialCode inválido ${id}:${q.id}`,
          );

          if (typeof q.codeBox.title !== "undefined") {
            assert(
              typeof q.codeBox.title === "string",
              `quizBank: codeBox.title inválido ${id}:${q.id}`,
            );
          }
        }
      }
    }

    for (const [slug, quizId] of Object.entries(this.topicQuizIdBySlug)) {
      assert(
        quizId in this.quizzes,
        `quizBank: mapeamento topicSlug->quizId inválido: ${slug} -> ${quizId}`,
      );
      assert(
        this.quizzes[quizId].scope === "topic",
        `quizBank: quiz de tópico esperado para ${slug} -> ${quizId}`,
      );
    }

    for (const [mod, examId] of Object.entries(this.moduleExamIdByNumber)) {
      assert(
        examId in this.quizzes,
        `quizBank: mapeamento módulo->prova inválido: ${mod} -> ${examId}`,
      );
      assert(
        this.quizzes[examId].scope === "module",
        `quizBank: quiz de módulo esperado para ${mod} -> ${examId}`,
      );
    }
  }
}

deepFreeze(quizzes);

const quizCatalog = new QuizCatalog(quizzes, {
  topicQuizIdBySlug,
  moduleExamIdByNumber,
});

export function getModuleExamId(moduleTitle?: string): string | undefined {
  const mod = parseModuleNumber(moduleTitle);
  if (!mod) return undefined;

  return quizCatalog.getModuleExamId(mod);
}

export function getTopicQuizId(topicSlug: string): string | undefined {
  return quizCatalog.getTopicQuizId(topicSlug);
}

export function getModuleId(moduleTitle?: string): string | undefined {
  const mod = parseModuleNumber(moduleTitle);
  if (!mod) return undefined;
  return `m${mod}`;
}

function parseModuleNumber(moduleTitle?: string): string | undefined {
  const m = moduleTitle?.match(/Módulo (\d+)/);
  return m ? m[1].padStart(2, "0") : undefined;
}
