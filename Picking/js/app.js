// 主应用模块
const App = (function() {
    'use strict';

    // 初始化应用
    function init() {
        console.log('MercPicking应用初始化...');
        
        // 初始化所有模块
        Utils.init();
        UploadModule.init();
        FilterModule.init();
        ProductsModule.init();
        ExportModule.init();
        ModalModule.init();
        
        // 初始化购物车模块
        if (typeof WishlistModule !== 'undefined') {
            WishlistModule.init();
        }
        
        // 初始化测试数据模块（用于调试）
        if (typeof TestDataModule !== 'undefined') {
            TestDataModule.init();
        }
        
        // 绑定导航事件
        bindNavigationEvents();
        
        // 绑定全局事件
        bindGlobalEvents();
        
        console.log('MercPicking应用初始化完成');
        
        // 显示欢迎信息
        setTimeout(() => {
            Utils.showMessage('欢迎使用 Catpapa 服装选款系统', 'info');
        }, 500);
    }

    // 绑定导航事件
    function bindNavigationEvents() {
        // 导航按钮事件绑定现在由ModalModule统一管理
        // 这里不再重复绑定，避免冲突
        console.log('导航事件绑定由ModalModule管理');
    }

    // 绑定全局事件
    function bindGlobalEvents() {
        // 页面加载完成后的初始化
        $(document).ready(function() {
            // 检查是否有已上传的数据
            const dataStore = Utils.getDataStore();
            const hasData = dataStore.clearanceData.length > 0 || dataStore.regularData.length > 0;
            
            if (hasData) {
                // 如果有数据，显示浏览页面
                showSection('browse');
                
                // 重新初始化筛选器和商品显示（使用优化后的分组数据）
                const allData = UploadModule.getMergedProductData();
                FilterModule.setProducts(allData);
                ProductsModule.displayProducts(allData);
            } else {
                // 否则显示上传页面
                showSection('upload');
                
                // 添加测试数据用于调试货币切换功能
                console.log('没有商品数据，货币切换功能可能无法正常工作');
                console.log('请上传Excel文件以加载商品数据');
            }
        });

        // 窗口大小变化时的响应式处理
        $(window).on('resize', Utils.debounce(function() {
            handleWindowResize();
        }, 250));

        // 阻止默认拖放行为
        $(document).on('dragover drop', function(e) {
            e.preventDefault();
        });
        
        // 绑定切换按钮事件
        $(document).on('click', '.switch-control', ProductsModule.handleToggleClick);
    }

    // 显示指定区域
    function showSection(sectionId) {
        // 隐藏所有内容区域（排除底部导航栏和欢迎页面）
        $('.main-content > div:not(.bottom-nav):not(#welcome)').hide();
        
        // 如果是商品页面且有数据，显示商品列表
        if (sectionId === 'products') {
            const productData = Utils.getDataStore('productData') || [];
            if (productData.length > 0) {
                $('#filter, #products').show();
                ProductsModule.displayProducts(productData);
                // 激活商品页面对应的导航项
                sectionId = 'products';
            } else {
                // 没有数据时显示欢迎页面
                $('#welcome').show();
                // 激活上传页面对应的导航项
                sectionId = 'upload';
            }
        } else {
            // 显示指定区域
            $(`#${sectionId}`).show();
        }
        
        // 更新底部导航激活状态
        $('.nav-item').removeClass('active');
        $(`.nav-item[data-section="${sectionId}"]`).addClass('active');
    }

    // 处理窗口大小变化
    function handleWindowResize() {
        // 可以在这里添加响应式布局的调整逻辑
        const width = $(window).width();
        
        if (width < 768) {
            // 移动端布局调整
            $('.product-grid').addClass('mobile-layout');
            $('.main-content').css('padding', '1rem');
        } else {
            // 桌面端布局调整
            $('.product-grid').removeClass('mobile-layout');
            $('.main-content').css('padding', '2rem');
        }
    }

    // 获取应用状态
    function getAppStatus() {
        const dataStore = Utils.getDataStore();
        const exportStats = ExportModule.getExportStats();
        
        return {
            dataUploaded: dataStore.clearanceData.length > 0 || dataStore.regularData.length > 0,
            clearanceDataCount: dataStore.clearanceData.length,
            regularDataCount: dataStore.regularData.length,
            exportStats: exportStats,
            currentFilter: dataStore.currentFilter || {}
        };
    }

    // 重置应用
    function resetApp() {
        // 清空数据存储
        Utils.setDataStore('clearanceData', []);
        Utils.setDataStore('regularData', []);
        Utils.setDataStore('currentFilter', {});
        

        
        // 重置上传状态
        UploadModule.resetUpload();
        
        // 显示上传页面
        showSection('upload');
        
        Utils.showMessage('应用已重置', 'info');
    }
    


    // 公共API
    return {
        init: init,
        showSection: showSection,
        getAppStatus: getAppStatus,
        resetApp: resetApp
    };
})();