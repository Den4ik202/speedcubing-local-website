from flask import Flask, render_template, request, jsonify, redirect, url_for
import database
import os
import sys


# Определяем правильный путь к ресурсам (работает и при обычном запуске, и внутри .exe)
if getattr(sys, 'frozen', False):
    # Если приложение скомпилировано в .exe
    base_dir = sys._MEIPASS
else:
    # Если запускаем как обычный .py скрипт
    base_dir = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(base_dir, 'templates'),
    static_folder=os.path.join(base_dir, 'static')
)

# Инициализируем БД при старте сервера
database.init_db()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/participants')
def participants():
    return render_template('participants.html')


@app.route('/api/participants/search')
def api_search_participants():
    q = request.args.get('q', '')
    if not q:
        return jsonify([])
    results = database.search_participants(q)
    return jsonify(results)


@app.route('/api/participants/save', methods=['POST'])
def api_save_participant():
    data = request.json
    p_id = data.get('id')
    fio = data.get('fio', '').strip()
    dob = data.get('dob', '').strip()
    other = data.get('other', '').strip()

    if not fio:
        return jsonify({"success": False, "error": "ФИО не может быть пустым"}), 400

    saved_id = database.save_participant_db(p_id, fio, dob, other)
    return jsonify({"success": True, "id": saved_id})


@app.route('/competitions')
def competitions():
    """Экран выбора соревнования"""
    comps = database.get_all_competitions()
    return render_template('competitions.html', comps=comps)

@app.route('/competition/form')
def competition_form():
    """Экран создания или изменения соревнования"""
    comp_id = request.args.get('id')
    comp = None
    if comp_id:
        comp = database.get_competition(comp_id)
    return render_template('comp_form.html', comp=comp)

@app.route('/api/competition/save', methods=['POST'])
def api_save_competition():
    """API для сохранения соревнования"""
    data = request.json
    comp_id = database.save_competition(
        data.get('id'),
        data.get('name'),
        data.get('address'),
        data.get('start'),
        data.get('end'),
        data.get('info'),
        data.get('disciplines')
    )
    return jsonify({"success": True, "id": comp_id})


@app.route('/competition/manage/<comp_id>')
def comp_manage(comp_id):
    """Экран управления конкретным соревнованием"""
    comp = database.get_competition(comp_id)
    if not comp:
        return redirect(url_for('competitions'))

    participants = database.get_competition_participants(comp_id)
    # Преобразуем строку дисциплин в список
    disciplines = [d.strip() for d in comp['disciplines'].split(',') if d.strip()]

    return render_template('comp_manage.html', comp=comp, participants=participants, disciplines=disciplines)


@app.route('/api/competition/<comp_id>/add_participant', methods=['POST'])
def api_add_participant_to_comp(comp_id):
    """API: Добавить участника в турнир"""
    data = request.json
    part_id = data.get('part_id')
    if not part_id:
        return jsonify({"success": False})

    success = database.add_participant_to_comp(comp_id, part_id)
    return jsonify({"success": success})


@app.route('/api/competition/<comp_id>/remove_participant', methods=['POST'])
def api_remove_participant_from_comp(comp_id):
    """API: Удалить участника из турнира"""
    data = request.json
    part_id = data.get('part_id')
    success = database.remove_participant_from_comp(comp_id, part_id)
    return jsonify({"success": success})


@app.route('/competition/<comp_id>/results/<discipline>')
def discipline_results(comp_id, discipline):
    """Экран ввода результатов по дисциплине"""
    comp = database.get_competition(comp_id)
    leaderboard = database.get_discipline_leaderboard(comp_id, discipline)
    # Передаем всех участников соревнования для автокомплита
    participants = database.get_competition_participants(comp_id)
    return render_template('results.html', comp=comp, discipline=discipline, leaderboard=leaderboard, participants=participants)

@app.route('/api/competition/<comp_id>/results/<discipline>/participant/<part_id>')
def api_get_part_results(comp_id, discipline, part_id):
    """API для подгрузки старых результатов"""
    attempts = database.get_participant_results(comp_id, discipline, part_id)
    return jsonify({"attempts": attempts})

@app.route('/api/competition/<comp_id>/results/<discipline>/save', methods=['POST'])
def api_save_results(comp_id, discipline):
    """API для сохранения 5 сборок"""
    data = request.json
    success = database.save_discipline_results(comp_id, discipline, data['part_id'], data['attempts'])
    return jsonify({"success": success})


if __name__ == '__main__':
    # Приложение запускается локально
    app.run(debug=True, port=5000)