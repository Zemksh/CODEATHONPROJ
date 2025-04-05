from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def dashboard():
    user = {
        'name': 'Adil',
        'photo_url': '../static/images/profilepic.jpg'
    }
    return render_template('dashboard.html', user=user)

if __name__ == '__main__':
    app.run(debug=True)