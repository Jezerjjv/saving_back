-- Tipos de pastilla (nombre + color) por usuario
CREATE TABLE IF NOT EXISTS pill_types (
  id      SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    VARCHAR(100) NOT NULL,
  color   VARCHAR(20) NOT NULL DEFAULT '#3498db'
);

CREATE INDEX IF NOT EXISTS idx_pill_types_user ON pill_types(user_id);

-- Recrear pill_log para asociar cada registro a un tipo de pastilla
DROP TABLE IF EXISTS pill_log;

CREATE TABLE pill_log (
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  pill_type_id INT NOT NULL REFERENCES pill_types(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, date, pill_type_id)
);

CREATE INDEX IF NOT EXISTS idx_pill_log_user_date ON pill_log(user_id, date);

COMMENT ON TABLE pill_types IS 'Tipos de pastilla/suplemento (ej. Creatina, Vitamina D) con nombre y color';
COMMENT ON TABLE pill_log IS 'Registro: usuario tomó este tipo de pastilla en esta fecha';
