// 弹窗管理模块
const ModalModule = (function () {

    // 显示搜索弹窗
    function showSearchModal() {
        // 检查是否有数据上传
        const dataStore = Utils.getDataStore();
        const hasData = dataStore.productData && dataStore.productData.length > 0;

        if (!hasData) {
            Utils.showMessage('请先导入数据才能使用搜索功能', 'warning');
            return;
        }

        // 创建搜索弹窗容器
        if ($('#search-modal').length === 0) {
            $('body').append(`
                 <div id="search-modal" class="modal-overlay" style="display: none;">
                     <div class="modal-container">
                         <div class="modal-header">
                             <div class="modal-title-container">
                                 <h3 class="modal-title">搜索商品</h3>
                                 <div class="modal-subtitle">输入商品名称、款号或编码进行搜索</div>
                             </div>
                             <button class="modal-close">×</button>
                         </div>
                         <div class="modal-body">
                             <div class="search-input-group">
                                 <input type="text" id="search-input" placeholder="输入商品名称、款号或编码..." class="search-input">
                                 <button id="search-btn" class="search-btn">搜索</button>
                             </div>
                             <div class="search-results" id="search-results" style="max-height: 300px; overflow-y: auto; margin-top: 1rem;">
                                 <p class="empty-search">请输入关键词搜索商品</p>
                             </div>
                         </div>
                     </div>
                 </div>
             `);

            // 绑定关闭事件
            $('#search-modal .modal-close, #search-modal').on('click', function (e) {
                if (e.target === this || $(e.target).hasClass('modal-close')) {
                    hideSearchModal();
                }
            });

            // 绑定ESC键关闭
            $(document).on('keydown.search', function (e) {
                if (e.key === 'Escape' && $('#search-modal').is(':visible')) {
                    hideSearchModal();
                }
            });

            // 绑定搜索按钮事件
            $('#search-btn').on('click', handleSearch);

            // 绑定回车键搜索
            $('#search-input').on('keypress', function (e) {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });
        }

        // 显示弹窗
        $('#search-modal').fadeIn(300);
        $('#search-modal .modal-container').show();
        $('body').css('overflow', 'hidden');

        // 聚焦搜索输入框
        setTimeout(() => {
            $('#search-input').focus();
        }, 100);
    }

    // 隐藏搜索弹窗
    function hideSearchModal() {
        $('#search-modal').fadeOut(300);
        $('body').css('overflow', '');
    }

    // 处理搜索
    function handleSearch() {
        const keyword = $('#search-input').val().trim();
        if (!keyword) {
            $('#search-results').html('<p class="search-hint">请输入搜索关键词</p>');
            return;
        }

        // 获取所有商品数据
        const productData = UploadModule.getMergedProductData ? UploadModule.getMergedProductData() : [];

        if (productData.length === 0) {
            $('#search-results').html('<p class="search-hint">暂无商品数据，请先导入数据</p>');
            return;
        }

        // 执行搜索
        const results = productData.filter(product => {
            const searchText = Object.values(product).join(' ').toLowerCase();
            return searchText.includes(keyword.toLowerCase());
        });

        // 显示搜索结果
        if (results.length === 0) {
            $('#search-results').html(`<p class="search-hint">未找到包含"${keyword}"的商品</p>`);
        } else {
            let html = `<div class="search-summary">找到 ${results.length} 个相关商品</div>`;

            results.slice(0, 10).forEach(product => {
                const productName = product['商品名称'] || '未知商品';
                const priceField = Utils.getPriceField();
                const price = parseFloat(product[priceField]) || 0;
                const category = product['商品分类'] || '未知分类';

                html += `
                     <div class="search-result-item">
                         <div class="result-info">
                             <div class="result-name">${productName}</div>
                             <div class="result-details">${category} | ${Utils.getCurrencySymbol()}${Utils.formatPrice(price)}</div>
                         </div>
                         <button class="result-action" data-product-id="${product['商品编码'] || ''}">查看</button>
                     </div>
                 `;
            });

            if (results.length > 10) {
                html += `<div class="search-more">还有 ${results.length - 10} 个商品未显示</div>`;
            }

            $('#search-results').html(html);

            // 绑定查看按钮事件
            $('.result-action').on('click', function () {
                const productId = $(this).data('product-id');
                hideSearchModal();
                // 跳转到商品页面
                if (typeof App !== 'undefined') {
                    App.showSection('products');
                }
            });
        }
    }

    // 显示重新导入弹窗（已删除，直接使用upload-modal）
    function showReuploadModal() {
        // 直接调用upload-modal弹窗
        if (typeof UploadModule !== 'undefined' && UploadModule.showUploadModal) {
            UploadModule.showUploadModal();
        }
    }

    // 显示用户信息弹窗
    function showUserModal() {
        const userInfo = LoginModule.getCurrentUser ? LoginModule.getCurrentUser() : {
            username: '张三',
            nameEN: 'Zhang San',
            avatar: 'images/avatar-placeholder.png',
            phone: '138-8888-8888'
        };

        // 修复头像路径
        const avatarPath = userInfo.avatar && userInfo.avatar.includes('imgaes/') ?
            userInfo.avatar.replace('imgaes/', 'imgs/') : userInfo.avatar;

        // 创建用户信息弹窗容器
        if ($('#user-modal').length === 0) {
            $('body').append(`
                 <div id="user-modal" class="modal-overlay" style="display: none;">
                     <div class="modal-container">
                         <div class="modal-header">
                             <div class="modal-title-container">
                                 
                             </div>
                             <button class="modal-close">×</button>
                         </div>
                         <div class="modal-body">
                             <div class="user-header">
                                 <div class="user-avatar-large">
                                     <img src="${avatarPath}" alt="${userInfo.username}" class="avatar-img-large" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iMzAiIGZpbGw9IiNlMWUxZTEiLz4KPHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE1IDE1QzE3LjQ4NDkgMTUgMTkuNSAxMi45ODQ5IDE5LjUgMTAuNUMxOS41IDguMDE1MTcgMTcuNDg0OSA2IDE1IDZDMTIuNTE1MSA2IDEwLjUgOC4wMTUxNyAxMC41IDEwLjZDMTEuNSAxMi45ODQ5IDEyLjUxNTEgMTUgMTUgMTVaIiBmaWxsPSIjOTk5Ii8+CjxwYXRoIGQ9Ik0xNSAxNy41QzEwLjg2IDcuNSAxMCAxNy41IDUgMTcuNUw1IDI3LjVIMjVWMTcuNUMyMCAxNy41IDE5LjE0IDE3LjUgMTUgMTcuNVoiIGZpbGw9IiM5OTkiLz4KPC9zdmc+Cjwvc3ZnPgo='">
                                 </div>
                                 <div class="user-info">
                                     <div class="user-name">
                                        <div class="name-english">${userInfo.nameEN || 'User'}</div>
                                         <div class="name-chinese">${userInfo.username}</div>
                                     </div>
                                     <div class="user-phone">
                                         <span class="phone-number">${userInfo.phone || '未设置'}</span>
                                     </div>
                                 </div>
                             </div>
                             <!-- 显示/隐藏切换按钮区域 -->
                             <div class="display-toggle-section">
                                <div class="toggle-buttons-container">
                                    <div class="switch-control" data-toggle-type="showTags">
                                        <span class="switch-label">
                                            <span class="switch-icon"><img src="imgs/tag.svg" alt="标签"></span>
                                            标签显示
                                        </span>
                                        <label class="switch">
                                            <input type="checkbox" class="switch-input">
                                            <span class="switch-slider"></span>
                                        </label>
                                        <span class="switch-status">已开启</span>
                                    </div>
                                    <div class="switch-control" data-toggle-type="showSKC">
                                        <span class="switch-label">
                                            <span class="switch-icon"><img src="imgs/skcinfo.svg" alt="款号"></span>
                                            款号显示
                                        </span>
                                        <label class="switch">
                                            <input type="checkbox" class="switch-input">
                                            <span class="switch-slider"></span>
                                        </label>
                                        <span class="switch-status">已开启</span>
                                    </div>
                                    <div class="switch-control" data-toggle-type="showCategory">
                                        <span class="switch-label">
                                            <span class="switch-icon"><img src="imgs/class.svg" alt="分类"></span>
                                            分类显示
                                        </span>
                                        <label class="switch">
                                            <input type="checkbox" class="switch-input">
                                            <span class="switch-slider"></span>
                                        </label>
                                        <span class="switch-status">已开启</span>
                                    </div>
                                </div>
                            </div>
                             <div class="currency-toggle-section">
                                <button id="toggle-currency" class="currency-toggle-button">
                                    <span class="button-text">当前货币单位</span>
                                    <span class="currency-indicator">${Utils.getCurrencySymbol()}</span>
                                </button>
                            </div>
                            <div class="user-actions">
                                <button id="logout-btn" class="action-button secondary">
                                    <span class="button-icon"><img src="imgs/logout.svg" alt="退出登录"></span>
                                    <span class="button-text">退出登录</span>
                                </button>
                                <button id="reupload-data" class="action-button primary">
                                    <span class="button-icon"><img src="imgs/upload.svg" alt="重新上传"></span>
                                    <span class="button-text">重新上传数据</span>
                                </button>
                            </div>
                         </div>
                     </div>
                 </div>
             `);

            // 绑定关闭事件
            $('#user-modal .modal-close, #user-modal').on('click', function (e) {
                if (e.target === this || $(e.target).hasClass('modal-close')) {
                    hideUserModal();
                }
            });

            // 绑定ESC键关闭
            $(document).on('keydown.user', function (e) {
                if (e.key === 'Escape' && $('#user-modal').is(':visible')) {
                    hideUserModal();
                }
            });

            // 绑定重新上传数据事件
            $('#reupload-data').on('click', function () {
                hideUserModal();
                if (typeof UploadModule !== 'undefined' && UploadModule.showUploadModal) {
                    UploadModule.showUploadModal();
                }
            });

            // 绑定货币切换事件 - 使用更可靠的事件委托
            $(document).on('click', '#toggle-currency', function () {
                console.log('货币切换按钮被点击');
                const newCurrency = Utils.toggleCurrency();
                const symbol = Utils.getCurrencySymbol();
                
                console.log('切换到货币:', newCurrency, '符号:', symbol);
                
                // 更新按钮上的货币指示器
                $('.currency-indicator').text(symbol);
                
                // 更新所有显示的价格
                updateAllPrices();
                
                // 触发货币切换事件，通知其他模块更新价格显示
                $(document).trigger('currencyChanged');
                
                Utils.showMessage(`已切换到${newCurrency === 'CNY' ? '人民币' : '美元'}显示`, 'success');
            });

            // 绑定退出登录事件
            $('#logout-btn').on('click', function () {
                if (confirm('确定要退出登录吗？')) {
                    hideUserModal();
                    // 执行退出登录逻辑
                    if (typeof App !== 'undefined' && App.logout) {
                        App.logout();
                    } else if (typeof LoginModule !== 'undefined' && LoginModule.showLogin) {
                        // 清空密钥输入框
                        $('#secret-key').val('');
                        // 显示登录界面
                        LoginModule.showLogin();
                        if (typeof Utils !== 'undefined') {
                            Utils.showMessage('已退出登录', 'info');
                        }
                    } else {
                        // 简单的退出逻辑：清除本地存储并刷新页面
                        localStorage.removeItem('userToken');
                        localStorage.removeItem('userData');
                        // 清空密钥输入框
                        $('#secret-key').val('');
                        location.reload();
                    }
                }
            });
        }

        // 显示弹窗
        $('#user-modal').fadeIn(300);
        $('#user-modal .modal-container').show();
        $('body').css('overflow', 'hidden');
        
        // 初始化切换按钮状态 - 使用setTimeout确保DOM完全渲染
        setTimeout(() => {
            if (typeof ProductsModule !== 'undefined' && ProductsModule.updateToggleButtons) {
                const preferences = ProductsModule.DisplayPreferences.getPreferences();
                ProductsModule.updateToggleButtons(preferences);
            }
        }, 50);
    }

    // 隐藏用户信息弹窗
    function hideUserModal() {
        $('#user-modal').fadeOut(300);
        $('body').css('overflow', '');
    }

    // 更新所有显示的价格（基于商品数据重新渲染）
    function updateAllPrices() {
        console.log('updateAllPrices - 开始更新所有价格');
        
        // 检查是否有商品卡片存在
        const $productCards = $('.product-card');
        console.log('updateAllPrices - 页面中商品卡片数量:', $productCards.length);
        
        // 更新商品列表中的价格 - 只更新价格显示，不重新渲染整个列表
        if (typeof ProductsModule !== 'undefined' && ProductsModule.getCurrentProducts) {
            const currentProducts = ProductsModule.getCurrentProducts();
            console.log('updateAllPrices - 获取当前商品数据:', { 
                productsCount: currentProducts ? currentProducts.length : 0,
                products: currentProducts ? currentProducts.slice(0, 3) : [] // 只显示前3个用于调试
            });
            
            if (currentProducts && currentProducts.length > 0) {
                updateProductPrices(currentProducts);
            } else {
                console.warn('updateAllPrices - 没有商品数据或商品数据为空');
                
                // 如果没有商品数据，尝试从数据存储中获取
                const storedData = Utils.getDataStore('productData');
                console.log('updateAllPrices - 从数据存储获取的商品数据:', {
                    storedDataCount: storedData ? storedData.length : 0
                });
            }
        } else {
            console.warn('updateAllPrices - ProductsModule或getCurrentProducts不存在');
        }

        // 更新搜索结果中的价格
        updateSearchResultsPrices();
    }

    // 更新商品卡片中的价格显示（不重新渲染整个列表）
    function updateProductPrices(products) {
        const priceField = Utils.getPriceField();
        const currencySymbol = Utils.getCurrencySymbol();

        console.log('updateProductPrices - 开始更新价格:', {
            priceField: priceField,
            currencySymbol: currencySymbol,
            productsCount: products.length
        });

        // 更新每个商品卡片的价格显示
        $('.product-card').each(function() {
            const $card = $(this);
            const skc = $card.data('skc');
            
            console.log('处理商品卡片:', { skc: skc });
            
            // 找到对应的商品数据 - 修复SKC字段类型不一致问题
            const product = products.find(p => {
                // 将SKC转换为字符串进行比较，确保类型一致
                const productSKC = String(p.skc || '');
                const cardSKC = String(skc || '');
                return productSKC === cardSKC;
            });
            
            if (product) {
                const price = parseFloat(product[priceField]) || 0;
                const priceText = currencySymbol + Utils.formatPrice(price);
                
                console.log('找到商品数据，更新价格:', { 
                    skc: skc, 
                    priceField: priceField, 
                    price: price, 
                    priceText: priceText 
                });
                
                // 更新价格显示
                $card.find('.product-price').text(priceText);
            } else {
                console.warn('未找到对应的商品数据:', { skc: skc });
                console.log('所有可用的SKC值:', products.map(p => ({ skc: p.skc, type: typeof p.skc })));
            }
        });
    }

    // 更新搜索结果中的价格
    function updateSearchResultsPrices() {
        const $results = $('.search-result-item');
        if ($results.length === 0) return;

        const priceField = Utils.getPriceField();
        const currencySymbol = Utils.getCurrencySymbol();

        $results.each(function() {
            const $this = $(this);
            const $details = $this.find('.result-details');
            const text = $details.text();
            
            // 提取商品分类信息
            const categoryMatch = text.match(/(.+?) \|/);
            const category = categoryMatch ? categoryMatch[1] : '';
            
            // 获取商品数据
            const productData = $this.data('product');
            if (productData) {
                const price = parseFloat(productData[priceField]) || 0;
                const priceText = currencySymbol + Utils.formatPrice(price);
                $details.text(category ? `${category} | ${priceText}` : priceText);
            }
        });
    }







    // 处理确认重新导入（已删除，功能已整合到upload-modal中）

    // 初始化弹窗功能
    function init() {
        // 绑定底部导航事件
        $('#nav-reupload').on('click', showReuploadModal);
        $('#nav-user').on('click', showUserModal);
        // 搜索按钮事件现在由FilterModule管理
        // $('#nav-search').on('click', showSearchModal);
        
        // 绑定购物车导航事件
        $('#nav-wishlist').on('click', function() {
            if (typeof WishlistModule !== 'undefined') {
                WishlistModule.showWishlistModal();
            }
        });
    }



    // 设置当前用户信息
    function setCurrentUser(user) {
        // 更新底部导航栏头像
        if (user && user.avatar) {
            // 修复头像路径（确保路径正确）
            const avatarPath = user.avatar && user.avatar.includes('imgaes/') ?
                user.avatar.replace('imgaes/', 'imgs/') : user.avatar;
            
            // 更新底部导航栏头像
            $('.user-avatar-small').attr('src', avatarPath);
            $('.user-avatar-small').attr('alt', user.username);
        }
    }

    return {
        init: init,
        showUserModal: showUserModal,
        showSearchModal: showSearchModal,
        hideUserModal: hideUserModal,
        hideSearchModal: hideSearchModal,

        setCurrentUser: setCurrentUser
    };
})();