import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';

// execFile no usa shell: la URL se pasa como un argumento separado, sin interpolación.
const execFileAsync = promisify(execFile);
const igRouter = Router();
const IG_POST_URL = /^https:\/\/(www\.|m\.)?instagram\.com\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?(\?[^\s"'`$;&|<>\\]*)?$/;

igRouter.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Falta el enlace de Instagram' });
    }

    // Validar formato estricto: solo publicaciones públicas de instagram.com
    if (typeof url !== 'string' || !IG_POST_URL.test(url.trim())) {
      return res.status(400).json({ error: 'Solo se aceptan enlaces de publicaciones de Instagram' });
    }

    // Usar yt-dlp para obtener el enlace directo (sin shell)
    const { stdout } = await execFileAsync('yt-dlp', [
      '-f', 'best', '--get-url', '--no-playlist', '--', url.trim(),
    ]);

    const videoUrl = stdout.trim();
    
    if (!videoUrl) {
      return res.status(404).json({ error: 'No se pudo obtener el video' });
    }

    res.json({ 
      success: true,
      videoUrl: videoUrl
    });

  } catch (error) {
    console.error('Error descargando:', error.message);
    res.status(500).json({ 
      error: 'No se pudo procesar el enlace. Inténtalo más tarde.'
    });
  }
});

export default igRouter;
