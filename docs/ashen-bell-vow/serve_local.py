#!/usr/bin/env python3
"""Local zero-dependency HTTP server for Ashen Bell Vow (ES Modules + Level Editor Save API).
Forces standard JS MIME types ('text/javascript') to avoid the Windows Registry bug
where Python's SimpleHTTPRequestHandler serves .js as text/plain.
"""
import http.server
import json
import mimetypes
import os
import re
import sys
import webbrowser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/svg+xml', '.svg')

SAFE_ROOM_ID = re.compile(r'^[A-Za-z0-9_-]{1,64}$')


class ModuleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '': 'application/octet-stream',
        '.html': 'text/html; charset=utf-8',
        '.htm': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def _send_json(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path != '/api/save-bundle':
            self._send_json(404, {'ok': False, 'error': 'Unknown API endpoint'})
            return
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            self._send_json(403, {'ok': False, 'error': 'Localhost only'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 10 * 1024 * 1024:
                self._send_json(400, {'ok': False, 'error': 'Invalid payload size'})
                return
            body = json.loads(self.rfile.read(length).decode('utf-8'))
            world = body.get('world')
            rooms = body.get('rooms')
            if not isinstance(world, dict) or not isinstance(rooms, list) or not rooms:
                self._send_json(400, {'ok': False, 'error': 'Missing world or rooms array'})
                return

            data_dir = os.path.join(BASE_DIR, 'data')
            rooms_dir = os.path.join(data_dir, 'rooms')
            os.makedirs(rooms_dir, exist_ok=True)

            manifest_rooms = []
            saved_files = []
            for rm in rooms:
                rid = str(rm.get('id', '')).strip()
                if not SAFE_ROOM_ID.match(rid):
                    self._send_json(400, {'ok': False, 'error': f'Invalid room id: {rid}'})
                    return
                fname = f'{rid}.json'
                fpath = os.path.join(rooms_dir, fname)
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump(rm, f, ensure_ascii=False, indent=2)
                saved_files.append(f'data/rooms/{fname}')
                manifest_rooms.append({
                    'id': rid,
                    'file': f'./data/rooms/{fname}',
                    'zoneName': rm.get('zoneName', '晦渊'),
                    'name': rm.get('name', rid),
                    'theme': rm.get('theme', 'corridor'),
                    'bounds': rm.get('bounds', {'x': 0, 'y': 0, 'w': 1280, 'h': 720}),
                    'connections': rm.get('connections', []),
                })

            world_out = {
                'schemaVersion': 1,
                'title': world.get('title', '灰钟残誓 · 晦渊全境'),
                'floorY': world.get('floorY', 580),
                'wellBottomY': world.get('wellBottomY', 1380),
                'startAltarId': world.get('startAltarId', 'altar_start'),
                'rooms': manifest_rooms,
            }
            with open(os.path.join(data_dir, 'world.json'), 'w', encoding='utf-8') as f:
                json.dump(world_out, f, ensure_ascii=False, indent=2)
            saved_files.insert(0, 'data/world.json')
            self._send_json(200, {'ok': True, 'saved': saved_files})
        except Exception as exc:
            self._send_json(500, {'ok': False, 'error': str(exc)})


def main():
    no_open = '--no-open' in sys.argv
    srv = None
    port = 8080
    for p in range(8080, 8100):
        try:
            srv = http.server.ThreadingHTTPServer(('127.0.0.1', p), ModuleHTTPRequestHandler)
            port = p
            break
        except OSError:
            continue

    if srv is None:
        raise SystemExit('端口 8080-8099 均被占用，请关闭部分本地服务后重试。')

    url = f'http://localhost:{port}/'
    print(f'>>> 灰钟残誓 v19.0 本地服务已就绪: {url}')
    print(f'>>> 房间关卡编辑器地址:        {url}editor.html')
    print('>>> 已启用 .js MIME 强制修正与编辑器本地保存 API (/api/save-bundle)')
    print('>>> 关闭此窗口或按 Ctrl+C 即可停止服务。\n')
    if not no_open:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\n服务已停止。')
    finally:
        srv.server_close()


if __name__ == '__main__':
    main()
