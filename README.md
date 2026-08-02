# Simulador ENADE Computação

Site para resolver as provas objetivas do **Exame Nacional de Desempenho dos
Estudantes (ENADE)** das áreas de Computação, de 2005 a 2021. Você escolhe o
ano e a versão da prova, responde uma questão por vez e, ao finalizar, vê
quantas acertou pelo gabarito oficial, com o desempenho em Formação Geral e
Componente Específico e a revisão questão a questão.

Endereço esperado depois de publicado: <https://feliperogai.github.io/enade-simulado/>

- 23 versões de prova, 804 questões objetivas (as discursivas ficam de fora).
- Questões recortadas dos PDFs originais, com figuras, fórmulas e código intactos.
- Funciona no celular, tem tema claro/escuro e guarda o progresso no navegador.

## As provas

As provas e os gabaritos originais estão em diretórios por ano de aplicação.
Em alguns anos há mais de uma prova, porque são de cursos diferentes:

* arquivos iniciados com **b**: Ciência da Computação, bacharelado;
* arquivos iniciados com **l**: Computação, licenciatura;
* arquivos iniciados com **e**: Engenharia da Computação;
* arquivos iniciados com **s**: Sistemas de Informação.

Em 2005, 2008 e 2011 um mesmo caderno atende a vários cursos; cada curso vira
uma versão separada no simulador (veja `pipeline/catalog.py`).

## Rodar o site localmente

Requer Node 22.22 ou mais recente.

```bash
cd site
npm install
npm run dev
```

Testes e build: `npm test`, `npm run typecheck` e `npm run build` (dentro de `site/`).

## Regenerar os dados das questões

Os arquivos em `site/public/data/` (o `exams.json` e as imagens WebP) são
gerados a partir dos PDFs e ficam versionados. Para gerar de novo (Python 3.12):

```bash
python -m pip install -r pipeline/requirements.txt
python -m pipeline.build
```

Depois, abra `pipeline/out/review.html` no navegador para conferir todos os
recortes. Se algum sair errado, corrija com uma entrada em
`pipeline/overrides.json` (segmentos explícitos por questão, em pontos do PDF) e
rode `python -m pipeline.build --only <caderno>` para refazer só aquele caderno.
Os testes do pipeline rodam com `python -m pytest pipeline/tests`.

## Publicar no GitHub Pages

O workflow `.github/workflows/deploy.yml` testa, compila e publica o site a cada
push na branch `main`. Para ativar, no GitHub: **Settings → Pages → Source:
GitHub Actions**.

## Para saber mais

* [Exame Nacional de Desempenho dos Estudantes (Enade)](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enade)
* [Provas e Gabaritos do ENADE](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enade/provas-e-gabaritos)
