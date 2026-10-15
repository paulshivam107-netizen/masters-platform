"""Local STARTTLS+AUTH SMTP server that writes each received message to ./mail/<n>.eml."""
import asyncio
import pathlib
import ssl

from aiosmtpd.controller import Controller
from aiosmtpd.smtp import AuthResult

OUT = pathlib.Path(__file__).parent / "mail"
OUT.mkdir(exist_ok=True)


class Handler:
    async def handle_DATA(self, server, session, envelope):
        n = len(list(OUT.glob("*.eml"))) + 1
        (OUT / f"{n}.eml").write_bytes(envelope.content)
        return "250 OK"


def authenticator(server, session, envelope, mechanism, auth_data):
    ok = auth_data.login == b"mailer" and auth_data.password == b"mailer-pass"
    return AuthResult(success=ok)


ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
ctx.load_cert_chain(OUT.parent / "cert.pem", OUT.parent / "key.pem")
controller = Controller(Handler(), hostname="127.0.0.1", port=2587, tls_context=ctx,
                        require_starttls=True, authenticator=authenticator, auth_require_tls=True)
controller.start()
print("smtp ready", flush=True)
asyncio.get_event_loop().run_forever()
