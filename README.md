# Aderenciamesa

Crie uma aplicação de status de disponibilidade para equipe/mesa em tempo real. Cada usuário deve poder definir seu status atual entre: 'On-line', 'Off-line', 'Ausente' e 'Em Almoço'.

Exiba um dashboard principal com a lista de todos os integrantes da mesa, mostrando o nome, o status atual com uma cor de badge correspondente (verde para online, cinza para offline, amarelo para ausente, azul para almoço) e há quanto tempo o status foi atualizado.

Configure a integração com Supabase habilitando o Realtime para que a lista atualize automaticamente para todos quando alguém alterar seu status.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aderenciamesa.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ed21d233-5a4c-5618-8d8c-a1be6a704afb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
