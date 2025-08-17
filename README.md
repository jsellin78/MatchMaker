## 🍸 MatchMaker AI for cocktails

An AI-powered drink recommendation app with a React frontend, Flask backend, and OpenAI integration.

---


## Live Demo
👉 [Try MatchMaker here](http://78.72.53.78:3005)

## 📋 Prerequisites
- Node.js (via [NVM](https://github.com/nvm-sh/nvm))
- Python 3.x (for `bartender.py`)
- pip (Python package manager)
- nginx (for serving the frontend)
- OpenAI API key (for GPT integration)

---

## ⚙️ Setup, Build, Deploy & Run

# 1. Install package.json and use the correct Node.js version
```
nvm install 20.5.0
nvm use 20.5.0
npm install
pip install -r requirements.txt
```

# 2. Build the React frontend

```
npm run build
```

# 3. Deploy frontend build, images, and drinks dictionaries
```
sudo mv ~/MatchMaker/build/* /var/www/html/ \
  && sudo mv images /var/www/html/images \
  && sudo mv systembolagetdict.json main_drinks.json /etc/nginx/sites-available/
```

# 4. Move nginx config into place and restart nginx
```
sudo mv nginx.conf /etc/nginx/sites-available/matchmaker \
  && sudo ln -s /etc/nginx/sites-available/matchmaker /etc/nginx/sites-enabled/ \
  && sudo nginx -t \
  && sudo systemctl restart nginx
```

# 5. Export your OpenAI API key
```
export OPENAI_API_KEY="YOUR-OPENAI-KEY"
```

# 6. Run the Flask backend
```
python bartender.py
```

# 7. Access the application
```
http://<your-ip:3005
```
