/**
 * 打印功能工具模块
 * 独立处理表格的打印功能
 */

// 防止重复加载
if (typeof window !== 'undefined' && !window.PrintUtils) {
    window.PrintUtils = {
        // 验证全局销售数据汇总变量是否存在并有效
        validateStats() {
            if (!window.salesDataSummary) {
                window.salesDataSummary = {
                    batchNumber: '',
                    styleSKCCount: 0,
                    orderQuantity: 0,
                    printTypeCount: 0
                };
            }
            // 确保所有字段都存在
            window.salesDataSummary.batchNumber = window.salesDataSummary.batchNumber || '';
            window.salesDataSummary.styleSKCCount = window.salesDataSummary.styleSKCCount || 0;
            window.salesDataSummary.orderQuantity = window.salesDataSummary.orderQuantity || 0;
            window.salesDataSummary.printTypeCount = window.salesDataSummary.printTypeCount || 0;
        },

        // 设置打印按钮功能
        setupPrintButton() {
            $('#printTabBtn').on('click', () => {
                // 验证全局统计变量
                this.validateStats();

                // 获取当前激活的tab内容
                const activeTab = $('.tab-content.active')[0];

                if (activeTab) {
                    // 创建打印窗口
                    const printWindow = window.open('', '_blank');

                    // 获取当前tab的标题
                    const tabTitle = $('.tab-btn.active').text();
                    const timestamp = new Date().toLocaleString('zh-CN');

                    // 获取批次号
                    const batchNumber = window.salesDataSummary.batchNumber || '';

                    // 获取全局销售数据汇总
                    const styleSKCCount = window.salesDataSummary.styleSKCCount || 0;
                    const orderQuantity = window.salesDataSummary.orderQuantity || 0;

                    // 构建打印内容
                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>${tabTitle} - ${timestamp}</title>
                            <link rel="stylesheet" href="style.css">
                            <style>
                                /* 全局样式 */
                                * {
                                    box-sizing: border-box;
                                }
                                 
                                html, body {
                                    height: 100%;
                                    margin: 0;
                                    padding: 0;
                                    font-family: Arial, sans-serif;
                                    background: white;
                                }
                                 
                                /* 页面容器 */
                                .print-container {
                                    min-height: 100vh;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: flex-start;
                                    align-items: center;
                                    padding: 20px 40px 40px;
                                    text-align: center;
                                    page-break-inside: avoid; 
                                }
                                 
                                /* 页眉样式 - 确保在打印预览和实际打印中都正确显示 */
                                .print-header {
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    justify-content: space-between;
                                    width: 100%;
                                    margin-bottom: 30px;
                                    padding: 15px 0;
                                    border-bottom: 1px solid #ddd;
                                    font-size: 16px;
                                    color: #000;
                                    text-align: center;
                                    justify-content: space-evenly;
                                }
                                /* 数据汇总部分 */
                                .summary-section {
                                    width: 100%;
                                    margin-bottom: 30px;
                                }
                                 
                                .summary-title {
                                    font-size: 20px;
                                    font-weight: bold;
                                    margin-bottom: 15px;
                                    color: #333;
                                }
                                 
                                .summary-content {
                                    font-size: 16px;
                                    color: #666;
                                }
                                 
                                /* 表格内容 */
                                .table-container {
                                    width: 100%;
                                    overflow-x: auto;
                                }
                                 
                                table {
                                    width: 100%;
                                    border-collapse: collapse;
                                }
                                 
                                th, td {
                                    text-align: center;
                                    border: 1px solid #ddd;
                                }
                                 
                                th {
                                    background-color: #f2f2f2;
                                    font-weight: bold;
                                    color: #333;
                                }
                                 
                                tr:nth-child(even) {
                                    background-color: #f9f9f9;
                                }
                                 
                                /* 隐藏包含复选框的整列 */
                                th.select,
                                td.select {
                                    display: none !important;
                                    width: 0 !important;
                                    max-width: 0 !important;
                                    overflow: hidden !important;
                                }
                                 
                                /* 打印专用样式 */
                                @media print {
                                    body {
                                        -webkit-print-color-adjust: exact;
                                        print-color-adjust: exact;
                                    }
                                      
                                    /* 确保所有页面的打印容器样式一致 */
                                    .print-container {
                                        min-height: auto;
                                        height: auto;
                                        page-break-inside: avoid;
                                        padding: 0;
                                    }
                                      
                                    /* 确保表格在打印时正确显示 */
                                    table {
                                        width: 100%;
                                        border-collapse: collapse;
                                        font-size: 14px;
                                        page-break-inside: auto;
                                    }

                                    /* 关键修复：确保thead在每一页都重复显示 */
                                    thead {
                                        display: table-header-group !important;
                                        page-break-inside: avoid !important;
                                        page-break-after: avoid !important;
                                    }

                                    /* 确保表格行和列不会跨页拆分 */
                                    tr {
                                        page-break-inside: avoid;
                                        page-break-after: auto;
                                    }
                                      
                                    tbody {
                                        display: table-row-group;
                                    }
                                      
                                    /* 确保表格标题不被拆分到不同页面 */
                                    th {
                                        page-break-after: avoid;
                                        break-after: avoid;
                                    }
                                      
                                    /* 隐藏summary-header和print-header，因为页眉已经包含了相同的数据 */
                                    .summary-header,
                                    .print-header {
                                        display: none !important;
                                    }
                                      
                                    /* 页眉页脚设置 - 确保多页打印时所有页面都显示页眉和页脚 */
                                    @page {
                                        /* 打印纸张边距设置 - 可以根据需要调整这些值
                                           margin-top: 上边距
                                           margin-bottom: 下边距
                                           margin-left: 左边距
                                           margin-right: 右边距
                                           单位为像素(px) */
                                        margin-top: 100px;
                                        margin-bottom: 100px;
                                        margin-left: 30px;
                                        margin-right: 30px;
                                           
                                        @top-center {
                                            content: "${tabTitle} ★ 总款数: ${styleSKCCount} ★ 订单件数: ${orderQuantity} ★ 批次: ${batchNumber}-" counter(page);
                                            font-size: 26px;
                                            color: #000;
                                            font-weight: bold;
                                            white-space: nowrap;
                                            text-align: center;
                                            /* 固定页眉位置 */
                                            position: running(header);
                                        }
                                        
                                        @bottom-center {
                                            content: "${timestamp} ★ 页码: " counter(page) "/" counter(pages);
                                            font-size: 20px;
                                            color: #000;
                                            white-space: nowrap;
                                            text-align: center;
                                        }
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="print-container">
                                <!-- 页眉部分 - 确保在打印预览中也能看到 -->
                                <div class="print-header" style="font-size: 18px; font-weight: bold; color: #000;">
                                   <div>${tabTitle}</div> | <div>款式汇总: <span id="styleSummary">${styleSKCCount} 款</span> </div>| <div>订单件数: <span id="orderQuantity">${orderQuantity} 件</span> </div>| <div>批次: ${batchNumber}</div>
                                </div>
                                
                                <!-- 表格内容部分 -->
                                <div class="table-container">
                                    <!-- 确保我们只获取表格内容 -->
                                    ${$(activeTab).find('table').length ? $(activeTab).find('table')[0].outerHTML : activeTab.innerHTML}
                                </div>
                            </div>
                        </body>
                        </html>
                    `);

                    printWindow.document.close();

                    // 延迟一下确保内容加载完成后再打印
                    setTimeout(() => {
                        printWindow.print();
                        // printWindow.close(); // 可选：打印后自动关闭窗口
                    }, 500);
                }
            });
        },

        // 初始化打印功能
        init() {
            this.setupPrintButton();
            // 确保全局统计变量已初始化
            this.validateStats();
        }
    };

    // 使用jQuery的ready方法在DOM加载完成后初始化打印功能
    $(() => {
        window.PrintUtils.init();
    });
}