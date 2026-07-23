import os

def add_news_link(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the nav block
    if '<nav class="main-nav"' not in content:
        return

    # Check if News is already there
    if 'href="/news"' in content:
        return

    # Add after Fundraising Guide
    old_guide = '<a href="/guide/raising-vc-funding-india" class="nav-link">Fundraising Guide</a>'
    new_guide_news = '<a href="/guide/raising-vc-funding-india" class="nav-link">Fundraising Guide</a>\n                <a href="/news" class="nav-link">News</a>'
    
    old_guide_active = '<a href="/guide/raising-vc-funding-india" class="nav-link active">Fundraising Guide</a>'
    new_guide_news_active = '<a href="/guide/raising-vc-funding-india" class="nav-link active">Fundraising Guide</a>\n                <a href="/news" class="nav-link">News</a>'

    if old_guide in content:
        content = content.replace(old_guide, new_guide_news)
    elif old_guide_active in content:
        content = content.replace(old_guide_active, new_guide_news_active)

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated {filepath}")

for root, dirs, files in os.walk('/Users/akshatchhapolia/Documents/VC_Dekho/VC_Dekho-main'):
    if 'node_modules' in root or '.vercel' in root or 'api' in root:
        continue
    for file in files:
        if file.endswith('.html'):
            add_news_link(os.path.join(root, file))
