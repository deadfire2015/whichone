// 登录模块
const LoginModule = (function() {
    let configData = null;
    let currentUser = null;

    // 加载配置文件
    function loadConfig() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'config.json',
                dataType: 'json',
                success: function(data) {
                    configData = data;
                    resolve(data);
                },
                error: function(xhr, status, error) {
                    console.error('加载配置文件失败:', error);
                    reject(error);
                }
            });
        });
    }

    // 验证密钥
    function validateSecretKey(secretKey) {
        if (!configData || !configData.users) {
            console.error('配置文件未加载或格式错误');
            return null;
        }
        
        // 查找匹配的用户
        const user = configData.users.find(u => u.secretKey === secretKey);
        return user || null;
    }

    // 显示登录界面
    function showLogin() {
        $('#login-section').show();
        $('#main-app').hide();
        // 显示视频背景
        $('#video-background').show();
        // 设置登录界面背景为透明，让视频背景显示
        $('body').css('background', 'transparent');
    }

    // 显示主应用
    function showMainApp() {
        $('#login-section').hide();
        $('#main-app').show();
        // 隐藏视频背景
        $('#video-background').hide();
        // 移除背景色设置，保持透明让页面内容正常显示
        $('body').css('background', 'transparent');
        
        // 更新用户信息显示
        if (currentUser && typeof ModalModule !== 'undefined') {
            ModalModule.setCurrentUser(currentUser);
        }
        
        // 登录后显示欢迎页面
        if (typeof App !== 'undefined') {
            App.showSection('products'); // 这会根据数据情况显示欢迎页面或商品页面
        }
    }

    // 处理登录事件
    function handleLogin() {
        const secretKey = $('#secret-key').val().trim();
        
        if (!secretKey) {
            Utils.showMessage('请输入密钥', 'error');
            return;
        }

        const user = validateSecretKey(secretKey);
        if (user) {
            currentUser = user;
            Utils.showMessage(`欢迎 ${user.username}！`, 'success');
            showMainApp();
            
            // 初始化应用
            if (typeof App !== 'undefined') {
                App.init();
            }
        } else {
            Utils.showMessage('密钥错误，请重新输入', 'error');
            $('#secret-key').val('').focus();
        }
    }

    // 获取当前用户
    function getCurrentUser() {
        return currentUser;
    }

    // 初始化登录系统
    function init() {
        return loadConfig().then(() => {
            console.log('登录系统初始化完成');
            
            // 绑定登录按钮事件
            $('#login-btn').on('click', handleLogin);
            
            // 绑定回车键事件
            $('#secret-key').on('keypress', function(e) {
                if (e.which === 13) {
                    handleLogin();
                }
            });
            
            // 确保页面加载时视频背景正确显示
            $('#video-background').show();
            $('body').css('background', 'transparent');
            
            // 默认显示登录界面
            showLogin();
            
        }).catch(error => {
            console.error('登录系统初始化失败:', error);
            Utils.showMessage('系统初始化失败，请刷新页面重试', 'error');
            throw error; // 重新抛出错误以便外部捕获
        });
    }

    return {
        init: init,
        showLogin: showLogin,
        showMainApp: showMainApp,
        getCurrentUser: getCurrentUser
    };
})();