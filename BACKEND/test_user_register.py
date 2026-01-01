import pytest

# conftest.py dosyasındaki test_client fixture'ını kullanıyoruz

@pytest.mark.asyncio
async def test_kayit_ol_basarili(test_client):
    """Yeni bir kullanıcı için kayıt olma sürecini test et"""
    
    payload = {
        "email": "deneme_test@ankara.edu.tr",
        "name": "Test Kullanici",
        "password": "sifre123"
    }

    # DÜZELTME 1: Gelen cevap (request, response) olduğu için ikisini de karşılıyoruz.
    # "_" işareti request'i, "response" ise asıl cevabı alır.
    _, response = await test_client.post("/api/kayit-ol", json=payload)

    # DÜZELTME 2: Sanic yerel istemcisinde ".status_code" yerine ".status" kullanılır.
    # Eğer hata alırsan tekrar .status_code yapabilirsin.
    assert response.status == 201, f"Beklenen 201, Alınan: {response.status}"
    
    # DÜZELTME 3: Sanic yerel istemcisinde .json genellikle bir özellik (property) gibidir, () gerekmez.
    # Eğer "dict is not callable" hatası alırsan parantezleri kaldır: response.json["basarili"]
    data = response.json
    assert data.get("basarili") is True


@pytest.mark.asyncio
async def test_kayit_ol_eksik_bilgi(test_client):
    """Eksik bilgi gönderildiğinde 400 hatası almalıyız"""
    
    payload = {
        "email": "eksik@ankara.edu.tr"
    }

    # Tuple unpacking (Paketi açıyoruz)
    _, response = await test_client.post("/api/kayit-ol", json=payload)

    # Durum kodu kontrolü
    assert response.status in [400, 422], f"Beklenen 400/422, Alınan: {response.status}"
    
    # Hata mesajı kontrolü
    hata_mesaji = response.json.get("mesaj", "") or response.json.get("detail", "")
    assert "doldurmanız gerekiyor" in str(hata_mesaji) or "field required" in str(hata_mesaji)