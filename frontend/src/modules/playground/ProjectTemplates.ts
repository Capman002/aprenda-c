export const PROJECT_TEMPLATES = {
  hello: {
    files: {
      "main.c": `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
    },
  },
  multifile: {
    files: {
      "main.c": `#include <stdio.h>
#include "math_ops.h"

int main() {
    printf("Soma: %d\\n", add(10, 20));
    printf("Fatorial: %d\\n", factorial(5));
    return 0;
}`,
      "math_ops.h": `#ifndef MATH_OPS_H
#define MATH_OPS_H

int add(int a, int b);
int factorial(int n);

#endif`,
      "math_ops.c": `#include "math_ops.h"

int add(int a, int b) {
    return a + b;
}

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}`,
    },
  },
  struct: {
    files: {
      "main.c": `#include <stdio.h>
#include "person.h"

int main() {
    Person p = create_person("Alice", 30);
    print_person(&p);
    birthday(&p);
    print_person(&p);
    return 0;
}`,
      "person.h": `#ifndef PERSON_H
#define PERSON_H

typedef struct {
    char name[50];
    int age;
} Person;

Person create_person(const char* name, int age);
void print_person(const Person* p);
void birthday(Person* p);

#endif`,
      "person.c": `#include <stdio.h>
#include <string.h>
#include "person.h"

Person create_person(const char* name, int age) {
    Person p;
    strncpy(p.name, name, 49);
    p.age = age;
    return p;
}

void print_person(const Person* p) {
    printf("Nome: %s, Idade: %d\\n", p->name, p->age);
}

void birthday(Person* p) {
    p->age++;
}`,
    },
  },
  snake: {
    files: {
      "main.c": `#include <stdio.h>
#include <stdlib.h>
#include <time.h>

// Simulação simplificada para output texto
#define WIDTH 20
#define HEIGHT 10

int main() {
    srand(time(NULL));
    int x = WIDTH / 2;
    int y = HEIGHT / 2;
    
    printf("=== SNAKE DEMO ===\\n");
    
    // Render Frame 01
    printf("\\n[FRAME 01]\\n");
    for(int i=0; i<HEIGHT; i++) {
        for(int j=0; j<WIDTH; j++) {
            if(i==y && j==x) printf("\x1b[92mO\x1b[0m"); // Snake Green
            else if(rand() % 50 == 0) printf("\x1b[91m@\x1b[0m"); // Apple Red
            else printf("\x1b[90m.\x1b[0m"); // Dot Gray
        }
        printf("\\n");
    }
    
    return 0;
}`,
    },
  },
  bitwise: {
    files: {
      "main.c": `#include <stdio.h>

void print_bin(unsigned char n) {
    for(int i=7; i>=0; i--) printf("%c", (n & (1<<i)) ? '1' : '0');
}

int main() {
    unsigned char a = 0xA5; // 10100101
    unsigned char b = 0x0F; // 00001111
    
    printf("A      = "); print_bin(a); printf("\n");
    printf("B      = "); print_bin(b); printf("\n");
    printf("A & B  = "); print_bin(a&b); printf("\n");
    printf("A | B  = "); print_bin(a|b); printf("\n");
    printf("A ^ B  = "); print_bin(a^b); printf("\n");
    
    return 0;
}`,
    },
  },
};
