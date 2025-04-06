from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Required for session management

# Variables to store targets
daily_target = None
weekly_target = None

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/daily_target', methods=['GET', 'POST'])
def set_daily_target():
    global daily_target
    
    if request.method == 'POST':
        daily_target = request.form['target']
        session['daily_target'] = daily_target
        return redirect(url_for('show_targets'))
    
    return render_template('dashboard.html')

@app.route('/weekly_target', methods=['GET', 'POST'])
def set_weekly_target():
    global weekly_target
    
    if request.method == 'POST':
        weekly_target = request.form['target']
        session['weekly_target'] = weekly_target
        return redirect(url_for('show_targets'))
    
    return render_template('weekly_target.html')

@app.route('/targets')
def show_targets():
    daily = session.get('daily_target', 'Not set')
    weekly = session.get('weekly_target', 'Not set')
    return render_template('targets.html', daily_target=daily, weekly_target=weekly)

if __name__ == '__main__':
    app.run(debug=True)