Como testar:

1. Abra um terminal nesta pasta.
2. Rode:
   py -m http.server 8000
3. No computador, abra:
   http://localhost:8000

Como testar no celular:

1. Deixe o computador e o celular na mesma rede Wi-Fi.
2. Descubra o IP do computador com:
   ipconfig
3. No celular, abra:
   http://IP_DO_COMPUTADOR:8000

Para instalar:

- Android/Chrome: menu do navegador > Adicionar a tela inicial.
- iPhone/Safari: compartilhar > Adicionar a Tela de Inicio.

Musicas:

1. Coloque arquivos .wav em assets/music.
2. Abra app.js.
3. Edite a linha MUSICAS, por exemplo:
   const MUSICAS = ["tema1.wav", "tema2.wav"];
