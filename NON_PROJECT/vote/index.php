<?php
/**
 * Escort Platform - Feature Voting System
 * Простая система голосования за функции
 * 
 * Установка на BeGet:
 * 1. Загрузите этот файл как index.php в отдельную папку (например: vote.es-project.ru)
 * 2. Создайте папку "data" рядом с этим файлом
 * 3. Дайте права 755 на папку data
 */

header('Content-Type: text/html; charset=utf-8');

$dataDir = __DIR__ . '/data';
$votesFile = $dataDir . '/votes.json';

// Создаём папку data если нет
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Инициализируем файл голосов если нет
if (!file_exists($votesFile)) {
    $initialData = [
        'votes' => [],
        'created_at' => date('Y-m-d H:i:s')
    ];
    file_put_contents($votesFile, json_encode($initialData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Обработка POST запросов
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    $action = $_POST['action'] ?? '';
    $data = json_decode(file_get_contents($votesFile), true);
    
    if ($action === 'vote') {
        $userId = $_POST['user_id'] ?? uniqid('user_');
        $featureId = $_POST['feature_id'] ?? '';
        $userName = $_POST['user_name'] ?? 'Аноним';
        $userRole = $_POST['user_role'] ?? 'developer';
        
        // Проверяем есть ли уже голос от этого пользователя
        $existingKey = array_search($userId, array_column($data['votes'], 'user_id'));
        
        if ($existingKey !== false) {
            // Обновляем голос
            $data['votes'][$existingKey]['feature_id'] = $featureId;
            $data['votes'][$existingKey]['updated_at'] = date('Y-m-d H:i:s');
        } else {
            // Новый голос
            $data['votes'][] = [
                'user_id' => $userId,
                'user_name' => $userName,
                'user_role' => $userRole,
                'feature_id' => $featureId,
                'voted_at' => date('Y-m-d H:i:s')
            ];
        }
        
        file_put_contents($votesFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        echo json_encode(['success' => true, 'message' => 'Голос принят']);
        exit;
    }
    
    if ($action === 'results') {
        // Подсчёт результатов
        $featureVotes = [];
        foreach ($data['votes'] as $vote) {
            $fid = $vote['feature_id'];
            if (!isset($featureVotes[$fid])) {
                $featureVotes[$fid] = [
                    'count' => 0,
                    'voters' => []
                ];
            }
            $featureVotes[$fid]['count']++;
            $featureVotes[$fid]['voters'][] = $vote['user_name'];
        }
        
        echo json_encode([
            'success' => true,
            'total_votes' => count($data['votes']),
            'feature_votes' => $featureVotes,
            'created_at' => $data['created_at']
        ]);
        exit;
    }
    
    if ($action === 'reset' && isset($_POST['admin_key'])) {
        // Сброс голосов (админка)
        if ($_POST['admin_key'] === 'escort2024admin') {
            $data = ['votes' => [], 'created_at' => date('Y-m-d H:i:s')];
            file_put_contents($votesFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode(['success' => true, 'message' => 'Голоса сброшены']);
        } else {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Неверный ключ']);
        }
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Escort Platform - Голосование за функции</title>
    <style>
        :root {
            --gold: #d4af37;
            --gold-light: #f4d03f;
            --black: #0a0a0a;
            --dark-gray: #1a1a1a;
            --medium-gray: #2d2d2d;
            --light-gray: #e0e0e0;
            --text-muted: #a0a0a0;
            --success: #4caf50;
            --danger: #f44336;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--black);
            color: var(--light-gray);
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            padding: 40px 20px;
            margin-bottom: 30px;
        }

        h1 {
            color: var(--gold);
            font-size: 2em;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 10px;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 1.1em;
        }

        .card {
            background: var(--dark-gray);
            border: 1px solid var(--medium-gray);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }

        .card-title {
            color: var(--gold);
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--medium-gray);
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 12px 16px;
            background: var(--black);
            border: 1px solid var(--medium-gray);
            border-radius: 8px;
            color: var(--light-gray);
            font-size: 14px;
            font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--gold);
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }

        .feature-card {
            background: var(--black);
            border: 2px solid var(--medium-gray);
            border-radius: 10px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        }

        .feature-card:hover {
            border-color: var(--gold);
            transform: translateY(-2px);
        }

        .feature-card.selected {
            border-color: var(--gold);
            background: rgba(212, 175, 55, 0.1);
        }

        .feature-card::before {
            content: "☐";
            position: absolute;
            top: 15px;
            right: 15px;
            font-size: 24px;
            color: var(--text-muted);
        }

        .feature-card.selected::before {
            content: "☑";
            color: var(--gold);
        }

        .feature-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--light-gray);
            margin-bottom: 8px;
            padding-right: 30px;
        }

        .feature-description {
            font-size: 13px;
            color: var(--text-muted);
            line-height: 1.5;
        }

        .feature-priority {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 10px;
        }

        .priority-high {
            background: rgba(244, 67, 54, 0.2);
            color: var(--danger);
        }

        .priority-medium {
            background: rgba(255, 152, 0, 0.2);
            color: #ff9800;
        }

        .priority-low {
            background: rgba(76, 175, 80, 0.2);
            color: var(--success);
        }

        .btn {
            background: var(--gold);
            color: var(--black);
            border: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
            width: 100%;
        }

        .btn:hover {
            background: var(--gold-light);
            transform: translateY(-2px);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-secondary {
            background: transparent;
            border: 2px solid var(--gold);
            color: var(--gold);
        }

        .btn-secondary:hover {
            background: var(--gold);
            color: var(--black);
        }

        .results-section {
            display: none;
        }

        .results-section.active {
            display: block;
        }

        .result-bar {
            background: var(--black);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
        }

        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .result-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--light-gray);
        }

        .result-count {
            font-size: 13px;
            color: var(--gold);
            font-weight: 600;
        }

        .result-bar-fill {
            height: 8px;
            background: var(--medium-gray);
            border-radius: 4px;
            overflow: hidden;
        }

        .result-bar-value {
            height: 100%;
            background: linear-gradient(90deg, var(--gold) 0%, var(--gold-light) 100%);
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        .result-voters {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--medium-gray);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: var(--black);
            border: 1px solid var(--gold);
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--gold);
            display: block;
        }

        .stat-label {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
        }

        .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
        }

        .tab-btn {
            flex: 1;
            padding: 12px;
            background: var(--dark-gray);
            border: 1px solid var(--medium-gray);
            border-radius: 8px;
            color: var(--text-muted);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .tab-btn.active {
            background: var(--gold);
            border-color: var(--gold);
            color: var(--black);
        }

        .view-section {
            display: none;
        }

        .view-section.active {
            display: block;
        }

        .alert {
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
        }

        .alert-success {
            background: rgba(76, 175, 80, 0.1);
            border: 1px solid var(--success);
            color: var(--success);
        }

        .alert-error {
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid var(--danger);
            color: var(--danger);
        }

        .hidden {
            display: none;
        }

        @media (max-width: 600px) {
            h1 {
                font-size: 1.5em;
            }
            .features-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎯 Escort Platform</h1>
            <p class="subtitle">Голосование за приоритетные функции MVP</p>
        </header>

        <div id="alert-container"></div>

        <!-- Tabs -->
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('vote')">Голосование</button>
            <button class="tab-btn" onclick="switchTab('results')">Результаты</button>
        </div>

        <!-- Vote Section -->
        <div id="vote-section" class="view-section active">
            <!-- Registration Form -->
            <div id="registration-form" class="card">
                <h2 class="card-title">📋 Представьтесь</h2>
                <div class="form-group">
                    <label>Ваше имя</label>
                    <input type="text" id="user-name" placeholder="Иван Иванов">
                </div>
                <div class="form-group">
                    <label>Ваша роль в проекте</label>
                    <select id="user-role">
                        <option value="developer">Разработчик</option>
                        <option value="designer">Дизайнер</option>
                        <option value="manager">Менеджер</option>
                        <option value="stakeholder">Заинтересованное лицо</option>
                    </select>
                </div>
                <button class="btn" onclick="startVoting()">Начать голосование</button>
            </div>

            <!-- Features Selection -->
            <div id="features-form" class="card hidden">
                <h2 class="card-title">🔥 Выберите самую важную функцию</h2>
                <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">
                    Проголосуйте за функцию, которую считаете наиболее важной для MVP
                </p>
                
                <div class="features-grid" id="features-grid">
                    <!-- Features will be loaded here -->
                </div>

                <button class="btn" onclick="submitVote()" style="margin-top: 24px;" id="submit-btn" disabled>
                    Отправить голос
                </button>
            </div>

            <!-- Thank You Message -->
            <div id="thank-you" class="card hidden">
                <h2 class="card-title">✅ Спасибо за участие!</h2>
                <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6;">
                    Ваш голос принят. Вы можете перейти на вкладку «Результаты», чтобы увидеть текущую статистику.
                </p>
                <button class="btn btn-secondary" onclick="switchTab('results')" style="margin-top: 20px;">
                    Смотреть результаты
                </button>
            </div>
        </div>

        <!-- Results Section -->
        <div id="results-section" class="view-section">
            <div class="card">
                <h2 class="card-title">📊 Результаты голосования</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-value" id="total-votes">0</span>
                        <span class="stat-label">Всего голосов</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="total-features">8</span>
                        <span class="stat-label">Функций</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value" id="created-date">-</span>
                        <span class="stat-label">Создано</span>
                    </div>
                </div>

                <div id="results-container">
                    <!-- Results will be loaded here -->
                </div>

                <button class="btn btn-secondary" onclick="loadResults()" style="margin-top: 20px;">
                    🔄 Обновить результаты
                </button>
            </div>
        </div>
    </div>

    <script>
        // Features data
        const features = [
            {
                id: 'escrow',
                name: 'Система эскроу',
                description: 'Безопасная сделка: заморозка средств, подтверждение встречи, автоматическая выплата',
                priority: 'high'
            },
            {
                id: 'video_verify',
                name: 'Видео-верификация',
                description: 'Видео с текущей датой для подтверждения подлинности анкеты',
                priority: 'high'
            },
            {
                id: 'rbac',
                name: 'Ролевая модель (RBAC)',
                description: 'Разграничение прав: клиент, модель, менеджер, админ',
                priority: 'high'
            },
            {
                id: 'messenger',
                name: 'Telegram/WhatsApp интеграция',
                description: 'Единая CRM для обоих каналов связи, защита контактов',
                priority: 'high'
            },
            {
                id: 'reliability',
                name: 'Рейтинг надёжности',
                description: 'Процент надёжности вместо звёзд с детальной статистикой',
                priority: 'medium'
            },
            {
                id: 'antileak',
                name: 'Анти-слив чат',
                description: 'Фильтрация номеров телефонов, предупреждения, логирование',
                priority: 'medium'
            },
            {
                id: 'psychotype',
                name: 'Подбор по психотипу',
                description: 'Тест на психотип клиента, персональная подборка анкет',
                priority: 'low'
            },
            {
                id: 'live_status',
                name: 'Live-статус анкеты',
                description: 'Отображение текущего статуса: в смене / свободна',
                priority: 'low'
            }
        ];

        let selectedFeature = null;
        let userId = localStorage.getItem('escort_vote_user_id');
        let userName = '';
        let userRole = '';

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            renderFeatures();
            loadResults();
            
            // Check if user already voted
            if (userId) {
                userName = localStorage.getItem('escort_vote_user_name') || '';
                userRole = localStorage.getItem('escort_vote_user_role') || '';
                showFeaturesForm();
            }
        });

        function renderFeatures() {
            const grid = document.getElementById('features-grid');
            grid.innerHTML = features.map(f => `
                <div class="feature-card" onclick="selectFeature('${f.id}')" data-feature="${f.id}">
                    <div class="feature-name">${f.name}</div>
                    <div class="feature-description">${f.description}</div>
                    <span class="feature-priority priority-${f.priority}">${getPriorityLabel(f.priority)}</span>
                </div>
            `).join('');
        }

        function getPriorityLabel(priority) {
            const labels = {
                'high': '🔴 Обязательно',
                'medium': '🟠 Средний',
                'low': '🟢 Необязательно'
            };
            return labels[priority] || priority;
        }

        function selectFeature(featureId) {
            selectedFeature = featureId;
            
            // Update UI
            document.querySelectorAll('.feature-card').forEach(card => {
                card.classList.remove('selected');
                if (card.dataset.feature === featureId) {
                    card.classList.add('selected');
                }
            });
            
            // Enable submit button
            document.getElementById('submit-btn').disabled = false;
        }

        function startVoting() {
            userName = document.getElementById('user-name').value.trim();
            userRole = document.getElementById('user-role').value;
            
            if (!userName) {
                showAlert('Пожалуйста, введите ваше имя', 'error');
                return;
            }
            
            // Generate or use existing user ID
            if (!userId) {
                userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('escort_vote_user_id', userId);
                localStorage.setItem('escort_vote_user_name', userName);
                localStorage.setItem('escort_vote_user_role', userRole);
            }
            
            showFeaturesForm();
        }

        function showFeaturesForm() {
            document.getElementById('registration-form').classList.add('hidden');
            document.getElementById('features-form').classList.remove('hidden');
        }

        async function submitVote() {
            if (!selectedFeature) {
                showAlert('Пожалуйста, выберите функцию', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('action', 'vote');
            formData.append('user_id', userId);
            formData.append('user_name', userName);
            formData.append('user_role', userRole);
            formData.append('feature_id', selectedFeature);
            
            try {
                const response = await fetch('', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('features-form').classList.add('hidden');
                    document.getElementById('thank-you').classList.remove('hidden');
                    showAlert('Голос успешно отправлен!', 'success');
                } else {
                    showAlert('Ошибка: ' + result.message, 'error');
                }
            } catch (error) {
                showAlert('Ошибка соединения: ' + error.message, 'error');
            }
        }

        async function loadResults() {
            try {
                const formData = new FormData();
                formData.append('action', 'results');
                
                const response = await fetch('', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('total-votes').textContent = result.total_votes;
                    document.getElementById('created-date').textContent = result.created_at.split(' ')[0];
                    
                    const container = document.getElementById('results-container');
                    
                    if (result.total_votes === 0) {
                        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">Пока нет голосов. Будьте первым!</p>';
                        return;
                    }
                    
                    // Sort features by votes
                    const sortedFeatures = Object.entries(result.feature_votes || {})
                        .sort((a, b) => b[1].count - a[1].count);
                    
                    const maxVotes = sortedFeatures.length > 0 ? sortedFeatures[0][1].count : 1;
                    
                    container.innerHTML = sortedFeatures.map(([featureId, data]) => {
                        const feature = features.find(f => f.id === featureId);
                        const percentage = Math.round((data.count / maxVotes) * 100);
                        
                        return `
                            <div class="result-bar">
                                <div class="result-header">
                                    <span class="result-name">${feature ? feature.name : featureId}</span>
                                    <span class="result-count">${data.count} голосов (${Math.round(data.count / result.total_votes * 100)}%)</span>
                                </div>
                                <div class="result-bar-fill">
                                    <div class="result-bar-value" style="width: ${percentage}%"></div>
                                </div>
                                ${data.voters.length > 0 ? `
                                    <div class="result-voters">
                                        Проголосовали: ${data.voters.join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('');
                }
            } catch (error) {
                console.error('Error loading results:', error);
            }
        }

        function switchTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tab + '-section').classList.add('active');
            
            if (tab === 'results') {
                loadResults();
            }
        }

        function showAlert(message, type) {
            const container = document.getElementById('alert-container');
            const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
            
            container.innerHTML = `
                <div class="alert ${alertClass}">
                    ${message}
                </div>
            `;
            
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }
    </script>
</body>
</html>
