import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool=mysql.createPool({
  host:process.env.DB_HOST,
  port:Number(process.env.DB_PORT||3306),
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD,
  database:process.env.DB_NAME,
  waitForConnections:true,
  connectionLimit:10,
  decimalNumbers:true
});

export async function query(sql,params=[]){
  const [rows]=await pool.execute(sql,params);
  return rows;
}

export async function ensureApplicationSchema() {
  const [columns] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'servicios'
       AND COLUMN_NAME = 'cantidad_disponible'`
  );

  if (Number(columns?.[0]?.total || 0) === 0) {
    await pool.execute(
      `ALTER TABLE servicios
       ADD COLUMN cantidad_disponible INT NOT NULL DEFAULT 1 AFTER disponibilidad`
    );

    console.log(
      'Migración aplicada: servicios.cantidad_disponible'
    );
  }

  await pool.execute(
    `UPDATE servicios
     SET cantidad_disponible = 1
     WHERE cantidad_disponible IS NULL OR cantidad_disponible < 0`
  );
}
