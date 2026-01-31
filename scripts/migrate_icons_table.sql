-- Migración: tabla icons para iconos de categorías y productos
-- Ejecutar en BBDD existente para tener iconos gestionables

CREATE TABLE IF NOT EXISTS icons (
  id     SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name   VARCHAR(100) NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_icons_symbol ON icons(symbol);

-- Valores iniciales (muchos iconos para categorías y productos)
INSERT INTO icons (symbol, name) VALUES
  ('📁', 'Carpeta'), ('🍔', 'Comida'), ('🚗', 'Coche'), ('🏠', 'Casa'), ('💡', 'Luz'), ('📱', 'Móvil'), ('🛒', 'Carrito'), ('☕', 'Café'), ('💰', 'Dinero'), ('🎁', 'Regalo'),
  ('✈️', 'Viajes'), ('📚', 'Libros'), ('🏥', 'Salud'), ('👕', 'Ropa'), ('🍕', 'Pizza'), ('⚽', 'Deporte'), ('🎬', 'Cine'), ('💼', 'Trabajo'), ('🧾', 'Recibo'), ('🏦', 'Banco'),
  ('🍎', 'Fruta'), ('🥗', 'Ensalada'), ('⛽', 'Gasolina'), ('🚌', 'Transporte'), ('🏋️', 'Gimnasio'), ('🎮', 'Juegos'), ('📺', 'TV'), ('🏡', 'Hogar'), ('🌳', 'Naturaleza'), ('🐶', 'Mascotas'),
  ('🎓', 'Estudios'), ('💊', 'Farmacia'), ('🧴', 'Higiene'), ('🎉', 'Fiestas'), ('🍷', 'Restaurante'), ('🥤', 'Bebidas'), ('🍽️', 'Comida fuera'), ('🛍️', 'Compras'), ('📦', 'Paquete'), ('🔧', 'Reparaciones'),
  ('💳', 'Tarjeta'), ('🏛️', 'Plan pensiones'), ('📈', 'Inversiones'), ('🐷', 'Ahorro'), ('💹', 'Interés'), ('🚂', 'Tren'), ('🚕', 'Taxi'), ('⛵', 'Ocio'), ('🎸', 'Música'),
  ('📷', 'Fotos'), ('💻', 'Tecnología'), ('🔌', 'Electricidad'), ('💧', 'Agua'), ('🔥', 'Calefacción'), ('📞', 'Teléfono'), ('🌐', 'Internet'), ('🖥️', 'Ordenador'), ('⌚', 'Reloj'), ('🔑', 'Alquiler'),
  ('🏢', 'Oficina'), ('🌍', 'Mundo'), ('⭐', 'Favorito'), ('❤️', 'Donaciones'), ('🎯', 'Meta'), ('📊', 'Gráficos'), ('🧩', 'Hobby'), ('🪴', 'Plantas'), ('🛋️', 'Muebles'), ('🧹', 'Limpieza')
ON CONFLICT (symbol) DO NOTHING;

COMMENT ON TABLE icons IS 'Iconos disponibles para categorías y tipos de producto; se pueden añadir más en Configuración';
