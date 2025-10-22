import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

const BASE_DIR = process.env.BASE_DIR;
const LOG_PATH = path.resolve('./error.log');

// Endpoint da sua API
const BUCKET_URL = process.env.BUCKET_URL;

// Função auxiliar para extrair o caminho do arquivo de cada linha de erro
function extractAudioPaths(logContent) {
    const regex = /Erro ao enviar (.*?): Request failed/;
    const lines = logContent.split('\n').filter(Boolean);
    const paths = [];

    for (const line of lines) {
        const match = line.match(regex);
        if (match) paths.push(match[1].trim());
    }
    return paths;
}

// Função principal para reenviar os arquivos
async function reprocessAudios() {
    const logContent = fs.readFileSync(LOG_PATH, 'utf-8');
    const audioPaths = extractAudioPaths(logContent);

    console.log(`🔁 Reprocessando ${audioPaths.length} arquivos com falha...\n`);

    for (const filePath of audioPaths) {

        try {
            const formData = new FormData();
            const fileStream = fs.createReadStream(filePath);

            // Extraindo parâmetros do caminho
            // Exemplo: /2025/06/10/13/1749560861.32_2005_20250610130745.wav
            const parts = filePath.split(path.sep);
            const year = parts[parts.length - 5];
            const month = parts[parts.length - 4];
            const day = parts[parts.length - 3];
            const hour = parts[parts.length - 2];
            const phone = 'Nao Identificado';

            const fileName = path.basename(filePath);
            const [uniqueId] = fileName.replace('.wav', '').split('_');

            formData.append('file', fileStream);
            formData.append('wallet', 'CEMIG - ESSENCIAL');
            formData.append('uniqueId', uniqueId);
            formData.append('year', year);
            formData.append('month', month);
            formData.append('day', day);
            formData.append('hour', hour);
            formData.append('phone', phone);

            const response = await axios.post(BUCKET_URL, formData, {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
            });

            console.log(`✅ Enviado: ${filePath} - status: ${response.status}`);
        } catch (err) {
            console.error(err);
            console.error(`❌ Falhou novamente: ${filePath} - ${err.message}`);
            fs.appendFileSync('./error_log_reprocess.log', `[${new Date().toISOString()}]Erro ao reenviar ${filePath}: ${err.message}\n`);
        }
    }

    console.log('\n🚀 Reprocessamento concluído!');
}

(async () => {
    console.log(`🚀 Iniciando reprocessamento de áudios do diretório: ${BASE_DIR}`);
    await reprocessAudios();
    console.log('✅ Upload finalizado!');
})();

// Executa o processo
