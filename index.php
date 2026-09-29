<?php
/**
 * Zoom Room Scheduler - Laragon Launcher
 * File ini membaca dan menyajikan langsung bundle aplikasi dari folder dist/
 * sehingga aplikasi dapat diakses secara elegan dan langsung pada:
 * http://e-jadwal.test maupun http://localhost/e-jadwal
 */

$distIndex = __DIR__ . '/dist/index.html';

if (file_exists($distIndex)) {
    header('Content-Type: text/html; charset=utf-8');

    // Deteksi otomatis URL akses: Virtual Host (e-jadwal.test) vs Subdirectory (localhost/e-jadwal)
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    $content = file_get_contents($distIndex);

    if (!empty($scriptDir) && $scriptDir !== '/') {
        // Jika diakses melalui subfolder (misal http://localhost/e-jadwal/)
        $content = str_replace('href="/assets/', 'href="' . $scriptDir . '/assets/', $content);
        $content = str_replace('src="/assets/', 'src="' . $scriptDir . '/assets/', $content);
        $content = str_replace('href="/logo-fikes-unbrah.png"', 'href="' . $scriptDir . '/logo-fikes-unbrah.png"', $content);
    }

    echo $content;
    exit;
} else {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Zoom Room Scheduler</title>
        <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1.25rem; box-shadow: 0 20px 30px rgba(0,0,0,0.3); max-width: 460px; text-align: center; border: 1px solid #334155; }
            h2 { margin-top: 0; color: #38bdf8; font-size: 1.5rem; }
            code { background: #0f172a; padding: 0.3rem 0.6rem; border-radius: 0.4rem; font-family: monospace; color: #fbbf24; font-size: 0.95rem; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>⚡ Memerlukan Build Aplikasi</h2>
            <p style="color: #94a3b8; font-size: 0.9rem;">Bundle aplikasi belum ditemukan. Silakan jalankan perintah ini sekali di terminal proyek:</p>
            <p><code>npm run build</code></p>
            <p style="font-size: 0.8rem; color: #64748b; margin-top: 1.5rem;">Setelah selesai, muat ulang (refresh) halaman ini.</p>
        </div>
    </body>
    </html>';
    exit;
}
