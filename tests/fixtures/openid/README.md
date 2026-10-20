# Respuestas de check_authentication

`is-valid-false.txt` es la respuesta **real** de
`https://steamcommunity.com/openid/login` ante una aserción falsificada,
capturada el 2026-10-20 (dos líneas, `ns:` y `is_valid:false`).

`is-valid-true.txt` reproduce el caso bueno con el mismo formato. No se puede
capturar de verdad sin pasar por el login de una cuenta real, así que está
escrito a mano siguiendo la especificación de OpenID 2.0.
