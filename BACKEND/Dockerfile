FROM python:3.11-slim

WORKDIR /app

# (opsiyonel ama faydalı) pip hızlandırma / cache
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# bağımlılıklar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# uygulama kodu
COPY . .

# uygulama portu (gerekirse sonra değiştiririz)
EXPOSE 8000

# uygulamayı ayağa kaldır
CMD ["python", "app.py"]
