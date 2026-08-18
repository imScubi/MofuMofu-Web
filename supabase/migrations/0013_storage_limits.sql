-- Los archivos ahora se suben directo a Storage desde el navegador,
-- porque la plataforma rechaza cualquier POST de más de 4.5 MB antes de
-- que el servidor lo vea. El servidor ya no puede medirlos al pasar, así
-- que el tope lo pone el propio bucket.
--
-- El de logos ya venía con 4 MB y su lista de formatos; al de
-- comprobantes le faltaban los dos.
update storage.buckets
set file_size_limit = 12582912,
    allowed_mime_types = array[
      'image/png',
      'image/jpeg',
      'image/webp',
      -- Un iPhone entrega HEIC si el usuario no cambió el ajuste.
      'image/heic',
      'image/heif',
      'application/pdf'
    ]
where id = 'payment-proofs';
