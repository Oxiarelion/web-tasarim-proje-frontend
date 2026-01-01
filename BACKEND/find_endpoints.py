import re

# Backend endpoints
with open('app.py', 'r', encoding='utf-8') as f:
    backend_content = f.read()

# Frontend API calls
frontend_files = [
    '../frontend/src/Pages/AdminPanel.jsx',
    '../frontend/src/Pages/EventDetails.jsx',
    '../frontend/src/Pages/EventsPage.jsx',
    '../frontend/src/Pages/FAQPage.jsx',
    '../frontend/src/Pages/FeedbackPage.jsx',
    '../frontend/src/Pages/LoginPage.jsx',
    '../frontend/src/Pages/MainPage.jsx',
    '../frontend/src/Pages/ResetPassword.jsx',
    '../frontend/src/Pages/UniversitiesPage.jsx',
    '../frontend/src/Pages/UserProfile.jsx',
]

# Backend routes'ları bul
backend_routes = re.findall(r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']\)', backend_content)
backend_endpoints = {}
for method, path in backend_routes:
    # Path parametrelerini normalize et
    normalized_path = re.sub(r'<[^>]+>', '{id}', path)
    key = f"{method.upper()} {normalized_path}"
    backend_endpoints[key] = path

# Frontend'de kullanılan API'leri bul
used_apis = set()
for frontend_file in frontend_files:
    try:
        with open(frontend_file, 'r', encoding='utf-8') as f:
            frontend_content = f.read()
        
        # fetch çağrılarını bul
        api_calls = re.findall(r'fetch\(["`]https?://[^/]+(/api/[^"`\s]+)', frontend_content)
        for api_path in api_calls:
            # Template literal parametrelerini normalize et
            api_path = re.sub(r'\$\{[^}]+\}', '{id}', api_path)
            used_apis.add(api_path)
    except FileNotFoundError:
        print(f"Dosya bulunamadı: {frontend_file}")

print("=" * 80)
print("BACKEND'DE TANIMLI TÜM ENDPOINT'LER:")
print("=" * 80)
for endpoint in sorted(backend_endpoints.keys()):
    print(f"  {endpoint}")

print("\n" + "=" * 80)
print("FRONTEND'DE KULLANILAN API'LER:")
print("=" * 80)
for api in sorted(used_apis):
    print(f"  {api}")

print("\n" + "=" * 80)
print("❌ KULLANILMAYAN ENDPOINT'LER:")
print("=" * 80)
unused = []
for key, path in backend_endpoints.items():
    method = key.split()[0]
    normalized_path = re.sub(r'<[^>]+>', '{id}', path)
    
    # Frontend'de bu path kullanılıyor mu kontrol et
    is_used = any(normalized_path in api or path in api for api in used_apis)
    
    if not is_used:
        unused.append(f"{key} - {path}")

for endpoint in sorted(unused):
    print(f"  {endpoint}")

print(f"\n📊 ÖZET:")
print(f"  Toplam Backend Endpoint: {len(backend_endpoints)}")
print(f"  Toplam Frontend API Call: {len(used_apis)}")
print(f"  Kullanılmayan Endpoint: {len(unused)}")
