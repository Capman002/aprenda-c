export const PROJECT_TEMPLATES: Record<
  string,
  { files: Record<string, string> }
> = {
  hello: {
    files: {
      "main.c": `#include <stdio.h>

int main() {
    char nome[50];

    printf("=== Bem-vindo ao Aprenda C! ===\\n\\n");
    printf("Qual e o seu nome? ");
    scanf("%49s", nome);

    printf("\\nOla, %s! Voce acabou de rodar seu primeiro programa em C.\\n", nome);
    printf("Experimente modificar este codigo e clicar em Run novamente.\\n");

    return 0;
}`,
    },
  },

  calculadora: {
    files: {
      "main.c": `#include <stdio.h>

int main() {
    double a, b, resultado;
    char op;

    printf("=== Calculadora em C ===\\n\\n");
    printf("Digite o primeiro numero: ");
    scanf("%lf", &a);

    printf("Digite a operacao (+, -, *, /): ");
    scanf(" %c", &op);

    printf("Digite o segundo numero: ");
    scanf("%lf", &b);

    switch (op) {
        case '+': resultado = a + b; break;
        case '-': resultado = a - b; break;
        case '*': resultado = a * b; break;
        case '/':
            if (b == 0) {
                printf("\\nErro: divisao por zero!\\n");
                return 1;
            }
            resultado = a / b;
            break;
        default:
            printf("\\nOperacao invalida: '%c'\\n", op);
            return 1;
    }

    printf("\\nResultado: %.2f %c %.2f = %.2f\\n", a, op, b, resultado);
    return 0;
}`,
    },
  },

  multifile: {
    files: {
      "main.c": `#include <stdio.h>
#include "utils.h"

int main() {
    printf("=== Projeto Multi-Arquivo ===\\n\\n");

    // Usando funcoes do modulo utils
    printf("Fatorial de 6: %d\\n", fatorial(6));
    printf("Fibonacci(10): %d\\n", fibonacci(10));
    printf("5 eh primo? %s\\n", eh_primo(5) ? "Sim" : "Nao");
    printf("12 eh primo? %s\\n", eh_primo(12) ? "Sim" : "Nao");

    // Interativo
    int n;
    printf("\\nDigite um numero para calcular o fatorial: ");
    scanf("%d", &n);

    if (n < 0 || n > 20) {
        printf("Numero fora do intervalo (0-20).\\n");
    } else {
        printf("Fatorial de %d = %ld\\n", n, (long)fatorial(n));
    }

    return 0;
}`,
      "utils.h": `#ifndef UTILS_H
#define UTILS_H

int fatorial(int n);
int fibonacci(int n);
int eh_primo(int n);

#endif`,
      "utils.c": `#include "utils.h"

int fatorial(int n) {
    if (n <= 1) return 1;
    return n * fatorial(n - 1);
}

int fibonacci(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    
    int a = 0, b = 1, temp;
    for (int i = 2; i <= n; i++) {
        temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

int eh_primo(int n) {
    if (n < 2) return 0;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return 0;
    }
    return 1;
}`,
    },
  },

  struct: {
    files: {
      "main.c": `#include <stdio.h>
#include <string.h>

// Definicao da struct
typedef struct {
    char nome[50];
    int idade;
    float nota;
} Aluno;

// Funcoes que operam sobre a struct
void exibir_aluno(const Aluno *a) {
    printf("  Nome: %s\\n", a->nome);
    printf("  Idade: %d anos\\n", a->idade);
    printf("  Nota: %.1f\\n", a->nota);
}

const char* situacao(const Aluno *a) {
    if (a->nota >= 7.0) return "Aprovado";
    if (a->nota >= 5.0) return "Recuperacao";
    return "Reprovado";
}

int main() {
    Aluno aluno;

    printf("=== Cadastro de Aluno (Structs) ===\\n\\n");

    printf("Nome: ");
    scanf("%49s", aluno.nome);

    printf("Idade: ");
    scanf("%d", &aluno.idade);

    printf("Nota (0 a 10): ");
    scanf("%f", &aluno.nota);

    printf("\\n--- Ficha do Aluno ---\\n");
    exibir_aluno(&aluno);
    printf("  Situacao: %s\\n", situacao(&aluno));

    return 0;
}`,
    },
  },

  ponteiros: {
    files: {
      "main.c": `#include <stdio.h>
#include <stdlib.h>

// Troca valores usando ponteiros
void trocar(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

// Aloca array e preenche com quadrados
int* criar_quadrados(int n) {
    int *arr = (int *)malloc(n * sizeof(int));
    if (!arr) return NULL;

    for (int i = 0; i < n; i++) {
        arr[i] = (i + 1) * (i + 1);
    }
    return arr;
}

int main() {
    printf("=== Ponteiros e Memoria ===\\n\\n");

    // 1. Ponteiro basico
    int x = 42;
    int *ptr = &x;
    printf("Valor de x: %d\\n", x);
    printf("Endereco de x: %p\\n", (void *)&x);
    printf("Valor via ponteiro: %d\\n\\n", *ptr);

    // 2. Swap com ponteiros
    int a = 10, b = 20;
    printf("Antes: a=%d, b=%d\\n", a, b);
    trocar(&a, &b);
    printf("Depois: a=%d, b=%d\\n\\n", a, b);

    // 3. Alocacao dinamica
    int n;
    printf("Quantos quadrados deseja gerar? ");
    scanf("%d", &n);

    if (n <= 0 || n > 100) {
        printf("Use um valor entre 1 e 100.\\n");
        return 1;
    }

    int *quadrados = criar_quadrados(n);
    if (!quadrados) {
        printf("Erro de alocacao!\\n");
        return 1;
    }

    printf("Quadrados perfeitos:\\n");
    for (int i = 0; i < n; i++) {
        printf("  %d^2 = %d\\n", i + 1, quadrados[i]);
    }

    free(quadrados); // Sempre libere a memoria!
    printf("\\nMemoria liberada com sucesso.\\n");

    return 0;
}`,
    },
  },

  bitwise: {
    files: {
      "main.c": `#include <stdio.h>

// Exibe o byte em binario
void print_bin(unsigned char n) {
    for (int i = 7; i >= 0; i--) {
        printf("%c", (n & (1 << i)) ? '1' : '0');
        if (i == 4) printf(" "); // separador visual
    }
}

// Liga um bit especifico
unsigned char ligar_bit(unsigned char valor, int pos) {
    return valor | (1 << pos);
}

// Desliga um bit especifico
unsigned char desligar_bit(unsigned char valor, int pos) {
    return valor & ~(1 << pos);
}

// Inverte um bit especifico
unsigned char inverter_bit(unsigned char valor, int pos) {
    return valor ^ (1 << pos);
}

int main() {
    printf("=== Operacoes Bitwise ===\\n\\n");

    unsigned char a = 0xA5; // 1010 0101
    unsigned char b = 0x3C; // 0011 1100

    printf("a        = "); print_bin(a); printf(" (0x%02X)\\n", a);
    printf("b        = "); print_bin(b); printf(" (0x%02X)\\n", b);
    printf("a AND b  = "); print_bin(a & b); printf(" (0x%02X)\\n", a & b);
    printf("a OR  b  = "); print_bin(a | b); printf(" (0x%02X)\\n", a | b);
    printf("a XOR b  = "); print_bin(a ^ b); printf(" (0x%02X)\\n", a ^ b);
    printf("NOT a    = "); print_bin(~a); printf(" (0x%02X)\\n", (unsigned char)~a);
    printf("a << 2   = "); print_bin(a << 2); printf(" (0x%02X)\\n", (unsigned char)(a << 2));
    printf("a >> 2   = "); print_bin(a >> 2); printf(" (0x%02X)\\n", a >> 2);

    printf("\\n--- Manipulacao de Bits ---\\n");
    unsigned char flags = 0x00;
    printf("Flags inicial:   "); print_bin(flags); printf("\\n");
    
    flags = ligar_bit(flags, 0);
    printf("Liga bit 0:      "); print_bin(flags); printf("\\n");
    
    flags = ligar_bit(flags, 3);
    printf("Liga bit 3:      "); print_bin(flags); printf("\\n");
    
    flags = ligar_bit(flags, 7);
    printf("Liga bit 7:      "); print_bin(flags); printf("\\n");
    
    flags = desligar_bit(flags, 3);
    printf("Desliga bit 3:   "); print_bin(flags); printf("\\n");
    
    flags = inverter_bit(flags, 0);
    printf("Inverte bit 0:   "); print_bin(flags); printf("\\n");

    return 0;
}`,
    },
  },
};
