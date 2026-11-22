#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Local zero-dependency HTTP server for Ashen Bell Vow (ES Modules + Level Editor Save API).
Compatible with both Python 2.7 and Python 3.x.
Forces standard JS MIME types ('text/javascript') to avoid the Windows Registry bug
where Python's SimpleHTTPRequestHandler serves .js as text/plain.
"""
from __future__ import print_function
import io
import json
import mimetypes
import os
import re
import sys
import webbrowser

try:
    import http.server as http_server
    import socketserver
except ImportError:
    import SimpleHTTPServer as http_server
    import SocketServer as socketserver

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/svg+xml', '.svg')

SAFE_ROOM_ID = re.compile(r'^[A-Za-z0-9_-]{1,64}$')


class ThreadingServer(socketserver.ThreadingMixIn, http_server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class ModuleHTTPRequestHandler(http_server.SimpleHTTPRequestHandler):
    extensions_map = http_server.SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update({
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
    })

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        http_server.SimpleHTTPRequestHandler.end_headers(self)

    def _send_json(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False)
        if not isinstance(raw, bytes):
            raw = raw.encode('utf-8')
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
            if not os.path.isdir(rooms_dir):
                os.makedirs(rooms_dir)

            manifest_rooms = []
            saved_files = []
            for rm in rooms:
                rid = str(rm.get('id', '')).strip()
                if not SAFE_ROOM_ID.match(rid):
                    self._send_json(400, {'ok': False, 'error': 'Invalid room id: {0}'.format(rid)})
                    return
                fname = '{0}.json'.format(rid)
                fpath = os.path.join(rooms_dir, fname)
                with io.open(fpath, 'w', encoding='utf-8') as f:
                    text = json.dumps(rm, ensure_ascii=False, indent=2)
                    if isinstance(text, bytes):
                        text = text.decode('utf-8')
                    f.write(text)
                saved_files.append('data/rooms/{0}'.format(fname))
                manifest_rooms.append({
                    'id': rid,
                    'file': './data/rooms/{0}'.format(fname),
                    'zoneName': rm.get('zoneName', u'晦渊'),
                    'name': rm.get('name', rid),
                    'theme': rm.get('theme', 'corridor'),
                    'bounds': rm.get('bounds', {'x': 0, 'y': 0, 'w': 1280, 'h': 720}),
                    'connections': rm.get('connections', []),
                })

            world_out = {
                'schemaVersion': 1,
                'title': world.get('title', u'灰钟残誓 · 晦渊全境'),
                'floorY': world.get('floorY', 580),
                'wellBottomY': world.get('wellBottomY', 1380),
                'startAltarId': world.get('startAltarId', 'altar_start'),
                'rooms': manifest_rooms,
            }
            with io.open(os.path.join(data_dir, 'world.json'), 'w', encoding='utf-8') as f:
                text = json.dumps(world_out, ensure_ascii=False, indent=2)
                if isinstance(text, bytes):
                    text = text.decode('utf-8')
                f.write(text)
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
            srv = ThreadingServer(('127.0.0.1', p), ModuleHTTPRequestHandler)
            port = p
            break
        except Exception:
            continue

    if srv is None:
        raise SystemExit(u'端口 8080-8099 均被占用，请关闭部分本地服务后重试。')

    url = 'http://localhost:{0}/'.format(port)
    print(u'>>> 灰钟残誓 v32.0 本地服务已就绪: {0}'.format(url))
    print(u'>>> 房间关卡编辑器地址:        {0}editor.html'.format(url))
    print(u'>>> 已启用 .js MIME 强制修正与编辑器本地保存 API (/api/save-bundle)')
    print(u'>>> 关闭此窗口或按 Ctrl+C 即可停止服务。\n')
    if not no_open:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print(u'\n服务已停止。')
    finally:
        srv.server_close()


if __name__ == '__main__':
    main()
