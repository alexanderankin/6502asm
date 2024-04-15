PORT = 8000

import http.server as BaseHTTPServer
import http.server as SimpleHTTPServer
BaseHTTPServer.HTTPServer(('0.0.0.0', PORT), SimpleHTTPServer.SimpleHTTPRequestHandler).serve_forever()
