/**
 * 映射表上传处理模块
 * 整合SKU2SKC映射表、SKC-印花大小映射表、印花图片映射表的上传功能
 */
if (typeof window !== 'undefined') {
    window.MappingUploader = class MappingUploader {
        constructor(jitOrderSystem) {
            this.jitOrderSystem = jitOrderSystem;
            this.mappingData = null;
            this.skcMappingData = null;
            this.patternImageData = null;
        }

        /**
         * 初始化上传功能
         */
        init() {
            // 设置上传按钮事件监听
            $('#mappingFileInput').on('change', (e) => {
                this.handleMappingFileUpload(e.target.files[0]);
            });

            // 初始化状态显示
            this.updateStatus('等待上传映射表...', '');
        }

        /**
         * 处理映射表文件上传
         * @param {File} file - 上传的Excel文件
         */
        async handleMappingFileUpload(file) {
            if (!file) return;

            // 重置状态和数据
            this.resetMappingData();
            
            // 更新状态
            this.updateStatus('正在解析映射表...', '');

            try {
                // 读取Excel文件中的所有工作表
                const workbookData = await this.readExcelWorkbook(file);
                
                // 解析各个工作表
                this.parseWorksheets(workbookData);
                
                // 验证解析后的数据
                this.validateParsedData();
                
                // 更新JITOrderSystem中的映射数据
                this.updateJitOrderSystemData();
                
                // 显示成功消息
                this.updateStatus(
                    `映射表解析成功！\nSKU-SKC映射: ${this.mappingData?.size || 0}条\nSKC-印花大小映射: ${this.skcMappingData?.size || 0}条\n印花图片映射: ${this.patternImageData?.size || 0}条`,
                    '',
                    true
                );
                
                // 启用销售表上传
                if ($('#salesFile').length && $('#salesBtn').length) {
                    $('#salesFile, #salesBtn').prop('disabled', false);
                }
                if ($('#salesStatus').length) {
                    $('#salesStatus').text('等待上传销售表...');
                }
                
                // 如果已有处理数据，重新生成烫画数量汇总表格以应用新的图片映射
                if (this.jitOrderSystem && this.jitOrderSystem.processedData && this.jitOrderSystem.displayPatternSummary) {
                    this.jitOrderSystem.displayPatternSummary();
                }
            } catch (err) {
                // 解析失败，清理数据
                this.resetMappingData();
                
                // 更新错误状态
                this.updateStatus('映射表解析失败', err?.message || '未知错误');
                
                // 禁用销售表上传
                if ($('#salesFile').length && $('#salesBtn').length) {
                    $('#salesFile, #salesBtn').prop('disabled', true);
                }
                if ($('#salesStatus').length) {
                    $('#salesStatus').text('请先上传有效的映射表');
                }
                
                console.error('映射表解析错误:', err);
            }
        }
        
        /**
         * 重置映射数据
         */
        resetMappingData() {
            this.mappingData = null;
            this.skcMappingData = null;
            this.patternImageData = null;
        }
        
        /**
         * 验证解析后的数据
         */
        validateParsedData() {
            if (!this.mappingData || this.mappingData.size === 0) {
                throw new Error('SKU2SKC映射表数据为空');
            }
            if (!this.skcMappingData || this.skcMappingData.size === 0) {
                throw new Error('SKC-印花大小映射表数据为空');
            }
            if (!this.patternImageData || this.patternImageData.size === 0) {
                throw new Error('印花图片映射表数据为空');
            }
        }

        /**
         * 读取Excel工作簿
         * @param {File} file - 要读取的文件
         * @returns {Promise<Object>} 包含所有工作表数据的对象
         */
        async readExcelWorkbook(file) {
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.csv')) {
                throw new Error('映射表必须是Excel格式文件(.xlsx或.xls)，不能是CSV文件');
            }
            
            // 使用JITOrderSystem的readExcelFile方法读取所有工作表
            return await this.jitOrderSystem.readExcelFile(file);
        }

        /**
         * 解析工作簿中的各个工作表
         * @param {Object} workbookData - 包含所有工作表数据的对象
         */
        parseWorksheets(workbookData) {
            // 检查必要的工作表是否存在
            const requiredSheets = ['SKU2SKC映射表', 'SKC2印花大小映射表', '印花图片映射表'];
            const missingSheets = requiredSheets.filter(sheetName => 
                !Object.keys(workbookData).includes(sheetName)
            );

            if (missingSheets.length > 0) {
                throw new Error(`文件中缺少必要的工作表：${missingSheets.join('、')}`);
            }

            // 解析SKU2SKC映射表
            const skuSkcData = workbookData['SKU2SKC映射表'];
            this.jitOrderSystem.validateMappingData(skuSkcData);
            this.mappingData = this.jitOrderSystem.processMappingData(skuSkcData);

            // 解析SKC-印花大小映射表
            const skcSizeData = workbookData['SKC2印花大小映射表'];
            this.jitOrderSystem.validateSkcMappingData(skcSizeData);
            this.skcMappingData = this.jitOrderSystem.processSkcMappingData(skcSizeData);

            // 解析印花图片映射表
            const patternImageData = workbookData['印花图片映射表'];
            this.jitOrderSystem.validatePatternImageData(patternImageData);
            this.patternImageData = this.jitOrderSystem.processPatternImageData(patternImageData);
        }

        /**
         * 更新JITOrderSystem中的映射数据
         */
        updateJitOrderSystemData() {
            this.jitOrderSystem.mappingData = this.mappingData;
            this.jitOrderSystem.skcMappingData = this.skcMappingData;
            this.jitOrderSystem.patternImageData = this.patternImageData;
        }

        /**
         * 更新状态显示
         * @param {string} statusText - 状态文本
         * @param {string} errorText - 错误文本
         * @param {boolean} isSuccess - 是否为成功状态
         */
        updateStatus(statusText, errorText, isSuccess = false) {
            const $status = $('#mappingStatus');
            const $error = $('#mappingError');

            $status.text(statusText);
            $error.text(errorText);

            if (isSuccess) {
                $status.addClass('status-success');
            } else {
                $status.removeClass('status-success');
            }
        }
    };
}

// 在DOM加载完成后初始化
$(document).ready(() => {
    // 这个模块将在JITOrderSystem初始化后被初始化
});