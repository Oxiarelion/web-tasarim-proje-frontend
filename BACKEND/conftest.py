import pytest
from app import app
from sanic_testing import TestManager
# Doğrudan Client sınıfını import ediyoruz
from sanic_testing.testing import SanicASGITestClient

# Test yöneticisini başlat
TestManager(app)

@pytest.fixture(scope="function")
async def test_client():
    """
    Her test için SIFIR, taze bir ASGI istemcisi oluşturur.
    Bu yöntem 'Cannot reopen' hatasını ve 'tuple' karmaşasını çözer.
    """
    # app.asgi_client yerine doğrudan sınıfı kullanıyoruz
    async with SanicASGITestClient(app) as client:
        yield client