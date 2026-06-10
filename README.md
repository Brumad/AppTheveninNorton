# TheoNor Calculator

Projeto de faculdade para automatizar calculos dos equivalentes de Thevenin e Norton em circuitos DC resistivos.

## Escopo do circuito

O software resolve um modelo didatico especifico:

- uma fonte de tensao DC;
- R1 fixo em serie com a fonte;
- ramo de saida entre os terminais A-B;
- R2 inicia o ramo A-B;
- R3, R4 e R5 entram em serie ou paralelo com o equivalente acumulado ate ali;
- suporte a ate 5 resistores.

Ele nao resolve qualquer circuito arbitrario. O objetivo e apoiar estudos e validacao de exercicios dentro desse modelo.

## Formulas

- `Vth = V * Req / (R1 + Req)`
- `Rth = R1 * Req / (R1 + Req)`
- `In = Vth / Rth`
- `Rn = Rth`

## Recursos

- interface grafica web/PWA;
- app desktop em Python/Tkinter;
- historico das ultimas 10 verificacoes;
- exportacao de relatorio `.txt`;
- exportacao de historico `.csv`;
- modelo Excel `.xlsx`;
- exemplo pronto para demonstracao;
- musica de fundo com mute, volume e skip.

## Exemplo manual

Fonte: `12 V`

Resistores:

- `R1 = 10 ohms`
- `R2 = 5 ohms`
- `R3 = 3 ohms` em paralelo com o acumulado
- `R4 = 4 ohms` em serie com o acumulado
- `R5 = 6 ohms` em paralelo com o acumulado

Calculo do ramo A-B:

```text
Req1 = (5 * 3) / (5 + 3) = 1.8750 ohms
Req2 = 1.8750 + 4 = 5.8750 ohms
Req  = (5.8750 * 6) / (5.8750 + 6) = 2.9684 ohms
```

Resultados:

```text
Tensão de Thévenin (Vth): 2.7468 V
Resistência de Thévenin (Rth): 2.2890 Ω
Corrente de Norton (In): 1.200000 A
Resistência de Norton (Rn): 2.2890 Ω
```

## Site

Depois de ativar o GitHub Pages, o site fica disponivel em:

```text
https://brumad.github.io/AppTheveninNorton/
```
