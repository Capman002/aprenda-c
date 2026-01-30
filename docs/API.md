# Documentação da API

API REST para o Playground do Aprenda C.

## Base URL

```
Desenvolvimento: http://localhost:3000
Produção: https://api.seu-dominio.com
```

## Autenticação

Atualmente a API não requer autenticação. Rate limiting é aplicado por IP.

---

## Endpoints

### Executar Código

Compila e executa código C no servidor.

```http
POST /api/execute
Content-Type: application/json
```

#### Request Body

```json
{
  "files": [
    {
      "name": "main.c",
      "content": "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}"
    },
    {
      "name": "utils.h",
      "content": "#ifndef UTILS_H\n#define UTILS_H\nvoid helper();\n#endif"
    }
  ],
  "stdin": ""
}
```

| Campo             | Tipo   | Obrigatório | Descrição                      |
| ----------------- | ------ | ----------- | ------------------------------ |
| `files`           | Array  | Sim         | Lista de arquivos do projeto   |
| `files[].name`    | String | Sim         | Nome do arquivo (ex: `main.c`) |
| `files[].content` | String | Sim         | Conteúdo do arquivo            |
| `stdin`           | String | Não         | Input para o programa          |

#### Response - Sucesso (200)

{
"success": true,
"timestamp": "2026-01-30T10:00:00.000Z",
"run": {
"stdout": "Hello, World!\n",
"stderr": "",
"exitCode": 0,
"signal": null
}
}

````

| Campo           | Tipo    | Descrição                         |
| --------------- | ------- | --------------------------------- |
| `success`       | Boolean | Se a requisição foi processada    |
| `run.stdout`    | String  | Saída padrão do programa          |
| `run.stderr`    | String  | Saída de erro e compilação        |
| `run.exitCode`  | Number  | Código de saída (0=Sucesso)       |

#### Response - Erro de Compilação (200)

```json
{
  "success": false,
  "output": "main.c:3:5: error: expected ';' before 'return'\n",
  "exitCode": 1,
  "stage": "compile"
}
````

#### Response - Erro de Validação (400)

```json
{
  "success": false,
  "error": "Arquivo principal 'main.c' não encontrado"
}
```

#### Response - Rate Limit (429)

```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

### Health Check

Verifica se a API está funcionando.

```http
GET /api/health
```

#### Response (200)

```json
{
  "status": "healthy",
  "timestamp": "2026-01-26T01:30:00.000Z",
  "uptime": 3600
}
```

---

### Listar Runtimes

Lista os runtimes disponíveis para execução.

```http
GET /api/runtimes
```

#### Response (200)

```json
{
  "runtimes": [
    {
      "language": "c",
      "version": "12.x (System GCC)",
      "aliases": ["gcc", "clang"]
    }
  ]
}
```

---

## Limites

| Recurso                   | Limite      |
| ------------------------- | ----------- |
| Requisições por minuto    | 10/IP       |
| Tamanho máximo do código  | 64 KB       |
| Número máximo de arquivos | 10          |
| Tempo máximo de execução  | 10 segundos |
| Memória máxima            | 100 MB      |

---

## Códigos de Erro

| Código HTTP | Significado                                         |
| ----------- | --------------------------------------------------- |
| 200         | Sucesso (mesmo para erros de compilação)            |
| 400         | Request inválido                                    |
| 429         | Rate limit excedido                                 |
| 500         | Erro interno do servidor                            |
| 500         | Erro interno do servidor (Falha na execução nativa) |

---

## Exemplos

### cURL

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "name": "main.c",
        "content": "#include <stdio.h>\nint main() { printf(\"Test\"); return 0; }"
      }
    ]
  }'
```

### JavaScript (Fetch)

```javascript
const response = await fetch("http://localhost:3000/api/execute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    files: [
      {
        name: "main.c",
        content: "#include <stdio.h>\nint main() { return 0; }",
      },
    ],
  }),
});

const result = await response.json();
console.log(result.output);
```

---

_Última atualização: Janeiro 2026_
