import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

const BASE_DIR = process.env.BASE_DIR + '/2025/08';
const WALLET_NAME = process.env.WALLET_NAME;
const BUCKET_URL = process.env.BUCKET_URL;
const LOG_FILE = path.join(process.cwd(), 'error.log'); // arquivo de log na raiz do projeto

/**
 * Função recursiva para percorrer todos os diretórios e coletar arquivos .wav
 */
async function uploadAudios(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      await uploadAudios(fullPath);
    } else if (item.isFile() && item.name.endsWith('.wav')) {
      await processAndUpload(fullPath);
    }
  }
}

async function processAndUpload(filePath) {
  try {
    const parts = filePath.split(path.sep);
    // Exemplo: [ ..., 'CEMIG - ESSENCIAL', '2025', '05', '06', '09', '32991994022', '1746534792.159_1001_20250506093313.wav']

    const [walletName, year, month, day, hour, phone, filename] = parts.slice(-7);
    const uniqueId = filename.split('_')[0];

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('wallet', WALLET_NAME);
    formData.append('uniqueId', uniqueId);
    formData.append('year', year);
    formData.append('month', month);
    formData.append('day', day);
    formData.append('hour', hour);
    formData.append('phone', phone);

    const res = await axios.post(BUCKET_URL, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity
    });

    console.log(`✅ Enviado: ${filename} (${res.status})`);
  } catch (err) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Erro ao enviar "${filePath}": ${err.message}\n`;

    console.error(`❌ ${logMessage}`);

    // adiciona no arquivo de log
    fs.appendFileSync(LOG_FILE, logMessage);
  }
}

/**
 * Execução principal
 */
(async () => {
  console.log(`🚀 Iniciando upload de áudios do diretório: ${BASE_DIR}`);
  await uploadAudios(BASE_DIR);
  console.log('✅ Upload finalizado!');
})();
