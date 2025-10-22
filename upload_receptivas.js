import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

const ROOT_DIR = process.env.BASE_DIR + '/2025/08';
const API_URL = process.env.BUCKET_URL;
const WALLET_NAME = process.env.WALLET_NAME;

// Função que percorre todas as gravações receptivas dentro de um ano/mês/dia
async function uploadReceptivas(baseDir) {
    // const years = fs.readdirSync(baseDir).filter(f => /^\d{4}$/.test(f));

    // for (const year of years) {
    //     const yearPath = path.join(baseDir, year);
    //     const months = fs.readdirSync(yearPath).filter(f => /^\d{2}$/.test(f));

        
        // for (const month of months) {
            const monthPath = ROOT_DIR;
            const days = fs.readdirSync(monthPath).filter(f => /^\d{2}$/.test(f));
            
            // console.log(days); return
            for (const day of days) {
                const dayPath = path.join(monthPath, day);
                const files = fs.readdirSync(dayPath).filter(f => f.startsWith('q-507-') && f.toLowerCase().endsWith('.wav'));
                
                for (const filename of files) {
                    const filePath = path.join(dayPath, filename);
                    const timestamp = new Date().toISOString();
                    
                    try {
                        // Exemplo: q-800-31999887766-20250519-085922-1746534792.159.WAV
                        const [, queue, phone, dateStr, timeStr, uniqueIdRaw] = filename.replace('.WAV', '').split('-');
                        const year = dateStr.substring(0, 4);
                        const month = dateStr.substring(4, 6);
                        const day = dateStr.substring(6, 8);
                        const uniqueId = uniqueIdRaw;

                        const formData = new FormData();
                        formData.append('file', fs.createReadStream(filePath));
                        formData.append('wallet', WALLET_NAME);
                        formData.append('uniqueId', uniqueId);
                        formData.append('year', year);
                        formData.append('month', month);
                        formData.append('day', day);
                        formData.append('hour', timeStr.slice(0, 2)); // extrai hora da gravação
                        formData.append('phone', phone);

                        const res = await axios.post(API_URL, formData, {
                            headers: formData.getHeaders(),
                            maxBodyLength: Infinity
                        });

                        const logMsgSuccess = `[${timestamp}] Enviado ${filePath} com sucesso\n`;

                        console.log(`✅ Enviado: ${filename} (${res.status})`);
                        fs.appendFileSync('./success_log_receptivas.log', logMsgSuccess);

                    } catch (err) {                        
                        const logMsg = `[${timestamp}] Erro ao enviar ${filePath}: ${err.message}\n`;
                        console.error(`❌ ${logMsg}`);
                        fs.appendFileSync('./error_log_receptivas.log', logMsg);
                    }
                }
            }
        // }
    // }
}

(async () => {
    uploadReceptivas(ROOT_DIR)
        .then(() => console.log('🚀 Upload de chamadas receptivas concluído!'))
        .catch(err => console.error('Erro geral:', err));
})();

