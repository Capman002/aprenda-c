export const TEMPLATES = {
  hello: {
    files: new Map([
      [
        "main.c",
        `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
      ],
    ]),
  },
  multifile: {
    files: new Map([
      [
        "main.c",
        `#include <stdio.h>
#include "utils.h"

int main() {
    printf("Hello, Robotics CS!\\n");
    
    int result = add(10, 20);
    printf("10 + 20 = %d\\n", result);
    
    return 0;
}`,
      ],
      [
        "utils.h",
        `#ifndef UTILS_H
#define UTILS_H

int add(int a, int b);
int subtract(int a, int b);

#endif`,
      ],
      [
        "utils.c",
        `#include "utils.h"

int add(int a, int b) {
    return a + b;
}

int subtract(int a, int b) {
    return a - b;
}`,
      ],
    ]),
  },
  struct: {
    files: new Map([
      [
        "main.c",
        `#include <stdio.h>
#include <string.h>

typedef struct {
    char name[50];
    int age;
} Person;

void printPerson(Person* p) {
    printf("Nome: %s, Idade: %d\\n", p->name, p->age);
}

void birthday(Person* p) {
    p->age++;
}

int main() {
    Person p1;
    strcpy(p1.name, "Alice");
    p1.age = 30;

    printPerson(&p1);
    birthday(&p1);
    printPerson(&p1);

    return 0;
}`,
      ],
    ]),
  },
  snake: {
    files: new Map([
      [
        "main.c",
        `#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include "game.h"

int main() {
    srand(time(NULL));
    
    printf("=== SNAKE GAME (Versão Linked List) ===\\n");
    printf("Demonstração de Alocação Dinâmica e Estruturas\\n\\n");
    
    Game game;
    game_init(&game);
    
    // Simulação de Game Loop (15 frames)
    for(int i = 0; i < 15; i++) {
        printf("\\n[FRAME %02d]\\n", i+1);
        game_update(&game);
        game_render(&game);
        
        if(game.state == GAME_OVER) {
            printf("\\n\\033[91m💀 GAME OVER! Pontuação Final: %d\\033[0m\\n", game.score);
            break;
        }
    }
    
    // Limpeza de memória (Importante!)
    game_cleanup(&game);
    return 0;
}`,
      ],
      [
        "snake.h",
        `#ifndef SNAKE_H
#define SNAKE_H

typedef struct Node {
    int x;
    int y;
    struct Node* next;
} Node;

typedef struct {
    Node* head;
    int length;
    int dx; // Direção X (-1, 0, 1)
    int dy; // Direção Y
} Snake;

void snake_init(Snake* s, int startX, int startY);
void snake_grow(Snake* s); // Adiciona nó no final
void snake_move(Snake* s); // Move cabeça, corpo segue
void snake_free(Snake* s); // Libera memória (Recursivo ou Iterativo)
int snake_check_collision(Snake* s, int width, int height);
int snake_check_self_collision(Snake* s);

#endif`,
      ],
      [
        "snake.c",
        `#include <stdlib.h>
#include "snake.h"

void snake_init(Snake* s, int startX, int startY) {
    s->head = malloc(sizeof(Node));
    s->head->x = startX;
    s->head->y = startY;
    s->head->next = NULL;
    s->length = 1;
    s->dx = 1; // Começa movendo para direita
    s->dy = 0;
}

void snake_grow(Snake* s) {
    Node* current = s->head;
    while(current->next != NULL) {
        current = current->next;
    }
    
    Node* new_node = malloc(sizeof(Node));
    new_node->x = current->x;
    new_node->y = current->y;
    new_node->next = NULL;
    current->next = new_node;
    s->length++;
}

void snake_move(Snake* s) {
    int newHeadX = s->head->x + s->dx;
    int newHeadY = s->head->y + s->dy;
    
    int prevX = s->head->x;
    int prevY = s->head->y;
    
    s->head->x = newHeadX;
    s->head->y = newHeadY;
    
    Node* current = s->head->next;
    while(current != NULL) {
        int tempX = current->x;
        int tempY = current->y;
        
        current->x = prevX;
        current->y = prevY;
        
        prevX = tempX;
        prevY = tempY;
        
        current = current->next;
    }
}

int snake_check_collision(Snake* s, int w, int h) {
    if (s->head->x < 0 || s->head->x >= w || s->head->y < 0 || s->head->y >= h)
        return 1;
    return 0;
}

int snake_check_self_collision(Snake* s) {
    Node* current = s->head->next;
    while(current != NULL) {
        if (current->x == s->head->x && current->y == s->head->y)
            return 1;
        current = current->next;
    }
    return 0;
}

void snake_free(Snake* s) {
    Node* current = s->head;
    while(current != NULL) {
        Node* next = current->next;
        free(current);
        current = next;
    }
    s->head = NULL;
    s->length = 0;
}
`,
      ],
      [
        "game.h",
        `#ifndef GAME_H
#define GAME_H

#include "snake.h"

#define BOARD_W 20
#define BOARD_H 10

typedef enum { RUNNING, GAME_OVER } State;

typedef struct {
    Snake snake;
    int foodX;
    int foodY;
    int score;
    State state;
} Game;

void game_init(Game* g);
void game_update(Game* g);
void game_render(Game* g);
void game_cleanup(Game* g);

#endif`,
      ],
      [
        "game.c",
        `#include <stdio.h>
#include <stdlib.h>
#include "game.h"

void spawn_food(Game* g) {
    g->foodX = rand() % BOARD_W;
    g->foodY = rand() % BOARD_H;
}

void game_init(Game* g) {
    snake_init(&g->snake, BOARD_W/2, BOARD_H/2);
    spawn_food(g);
    g->score = 0;
    g->state = RUNNING;
}

void game_update(Game* g) {
    if (g->state == GAME_OVER) return;

    int hx = g->snake.head->x;
    int hy = g->snake.head->y;
    
    if (g->foodX > hx) { g->snake.dx = 1; g->snake.dy = 0; }
    else if (g->foodX < hx) { g->snake.dx = -1; g->snake.dy = 0; }
    else if (g->foodY > hy) { g->snake.dx = 0; g->snake.dy = 1; }
    else if (g->foodY < hy) { g->snake.dx = 0; g->snake.dy = -1; }

    snake_move(&g->snake);
    
    if (snake_check_collision(&g->snake, BOARD_W, BOARD_H) || 
        snake_check_self_collision(&g->snake)) {
        g->state = GAME_OVER;
    }
    
    if (hx == g->foodX && hy == g->foodY) {
        g->score += 10;
        snake_grow(&g->snake);
        spawn_food(g);
        printf("\\033[93m🍌 Nham! Comida! Score: %d\\033[0m\\n", g->score);
    }
}

void game_render(Game* g) {
    for(int y=0; y<BOARD_H; y++) {
        printf("  "); // Margem
        for(int x=0; x<BOARD_W; x++) {
            int printed = 0;
            
            Node* current = g->snake.head;
            while(current != NULL) {
                if(current->x == x && current->y == y) {
                    if(current == g->snake.head) printf("\\033[92mO\\033[0m"); // Cabeça Verde
                    else printf("\\033[92mo\\033[0m"); // Corpo Verde
                    printed = 1;
                    break;
                }
                current = current->next;
            }
            if(printed) continue;
            
            if (x == g->foodX && y == g->foodY) {
                printf("\\033[91m@\\033[0m");
                continue;
            }
            
            printf("\\033[90m.\\033[0m");
        }
        printf("\\n");
    }
}

void game_cleanup(Game* g) {
    snake_free(&g->snake);
}
`,
      ],
    ]),
  },
  bitwise: {
    files: new Map([
      [
        "main.c",
        `#include <stdio.h>
#include <stdint.h>

void print_bits(uint8_t n) {
    for (int i = 7; i >= 0; i--) {
        printf("%c", (n & (1 << i)) ? '1' : '0');
    }
}

int main() {
    uint8_t a = 0xA5; // 1010 0101
    // ...
    return 0;
}`,
      ],
    ]),
  },
};
