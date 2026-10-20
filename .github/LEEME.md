# CI pendiente de activar

`ci-pendiente.yml` es el workflow de CI (typecheck, lint, pruebas, validación de
los paquetes de guía y compilación). Está acá y no en `.github/workflows/`
porque GitHub rechaza un push que cree o modifique un workflow si el token no
tiene el scope `workflow`.

Para activarlo, cualquiera de las dos:

1. Desde la terminal, con el scope puesto:

   ```bash
   gh auth refresh -s workflow     # imprime un código de 8 caracteres en la terminal
   git mv .github/ci-pendiente.yml .github/workflows/ci.yml
   git commit -m "Activa el CI" && git push
   ```

2. Desde la web de GitHub, que no necesita ese scope: **Add file → Create new
   file**, nombre `.github/workflows/ci.yml`, y pegar el contenido de
   `ci-pendiente.yml`.
