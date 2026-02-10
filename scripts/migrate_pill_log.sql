-- Control de pastillas: un registro por día que el usuario marcó como "tomada"
CREATE TABLE IF NOT EXISTS pill_log (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date     DATE NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_pill_log_user_date ON pill_log(user_id, date);

COMMENT ON TABLE pill_log IS 'Días en que el usuario registró haber tomado la pastilla';
