import { CellValidation } from '@/types'

export interface ValidationRule {
  type: 'range' | 'list' | 'regex' | 'custom' | 'length' | 'required'
  config: any
  message?: string
}

export interface ValidationResult {
  isValid: boolean
  message?: string
}

export class DataValidator {
  static validate(value: any, validation: CellValidation): ValidationResult {
    if (!validation) {
      return { isValid: true }
    }

    try {
      switch (validation.type) {
        case 'required':
          return this.validateRequired(value, validation.config, validation.message)
        
        case 'range':
          return this.validateRange(value, validation.config, validation.message)
        
        case 'list':
          return this.validateList(value, validation.config, validation.message)
        
        case 'regex':
          return this.validateRegex(value, validation.config, validation.message)
        
        case 'length':
          return this.validateLength(value, validation.config, validation.message)
        
        case 'custom':
          return this.validateCustom(value, validation.config, validation.message)
        
        default:
          return { isValid: true }
      }
    } catch (error) {
      return {
        isValid: false,
        message: `验证规则执行错误: ${error.message}`
      }
    }
  }

  private static validateRequired(value: any, config: any, message?: string): ValidationResult {
    const isEmpty = value == null || value === '' || 
                   (Array.isArray(value) && value.length === 0)
    
    return {
      isValid: !isEmpty,
      message: isEmpty ? (message || '此字段为必填项') : undefined
    }
  }

  private static validateRange(value: any, config: { min?: number, max?: number }, message?: string): ValidationResult {
    const numValue = Number(value)
    if (isNaN(numValue)) {
      return {
        isValid: false,
        message: message || '值必须是数字'
      }
    }

    if (config.min !== undefined && numValue < config.min) {
      return {
        isValid: false,
        message: message || `值不能小于 ${config.min}`
      }
    }

    if (config.max !== undefined && numValue > config.max) {
      return {
        isValid: false,
        message: message || `值不能大于 ${config.max}`
      }
    }

    return { isValid: true }
  }

  private static validateList(value: any, config: { options: any[], allowOther?: boolean }, message?: string): ValidationResult {
    const isInList = config.options.includes(value)
    
    if (!isInList && !config.allowOther) {
      return {
        isValid: false,
        message: message || `值必须是以下选项之一: ${config.options.join(', ')}`
      }
    }

    return { isValid: true }
  }

  private static validateRegex(value: any, config: { pattern: string, flags?: string }, message?: string): ValidationResult {
    try {
      const regex = new RegExp(config.pattern, config.flags || '')
      const strValue = String(value)
      
      if (!regex.test(strValue)) {
        return {
          isValid: false,
          message: message || '格式不正确'
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        message: `正则表达式错误: ${error.message}`
      }
    }
  }

  private static validateLength(value: any, config: { min?: number, max?: number }, message?: string): ValidationResult {
    const strValue = String(value)
    const length = strValue.length

    if (config.min !== undefined && length < config.min) {
      return {
        isValid: false,
        message: message || `长度不能少于 ${config.min} 个字符`
      }
    }

    if (config.max !== undefined && length > config.max) {
      return {
        isValid: false,
        message: message || `长度不能超过 ${config.max} 个字符`
      }
    }

    return { isValid: true }
  }

  private static validateCustom(value: any, config: { validator: Function }, message?: string): ValidationResult {
    try {
      const result = config.validator(value)
      
      if (typeof result === 'boolean') {
        return {
          isValid: result,
          message: result ? undefined : (message || '自定义验证失败')
        }
      }
      
      if (typeof result === 'object' && result.hasOwnProperty('isValid')) {
        return result as ValidationResult
      }
      
      return {
        isValid: false,
        message: '自定义验证函数返回值格式错误'
      }
    } catch (error) {
      return {
        isValid: false,
        message: `自定义验证执行错误: ${error.message}`
      }
    }
  }

  static createRangeValidation(min?: number, max?: number, message?: string): CellValidation {
    return {
      type: 'range',
      config: { min, max },
      message
    }
  }

  static createListValidation(options: any[], allowOther: boolean = false, message?: string): CellValidation {
    return {
      type: 'list',
      config: { options, allowOther },
      message
    }
  }

  static createRegexValidation(pattern: string, flags?: string, message?: string): CellValidation {
    return {
      type: 'regex',
      config: { pattern, flags },
      message
    }
  }

  static createLengthValidation(min?: number, max?: number, message?: string): CellValidation {
    return {
      type: 'length',
      config: { min, max },
      message
    }
  }

  static createCustomValidation(validator: Function, message?: string): CellValidation {
    return {
      type: 'custom',
      config: { validator },
      message
    }
  }

  static createEmailValidation(message?: string): CellValidation {
    return this.createRegexValidation(
      '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      'i',
      message || '请输入有效的邮箱地址'
    )
  }

  static createPhoneValidation(message?: string): CellValidation {
    return this.createRegexValidation(
      '^1[3-9]\\d{9}$',
      '',
      message || '请输入有效的手机号码'
    )
  }

  static createDateValidation(message?: string): CellValidation {
    return this.createCustomValidation(
      (value: any) => {
        const date = new Date(value)
        return !isNaN(date.getTime())
      },
      message || '请输入有效的日期'
    )
  }

  static createUrlValidation(message?: string): CellValidation {
    return this.createRegexValidation(
      '^https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&=]*)$',
      'i',
      message || '请输入有效的URL地址'
    )
  }

  static createCurrencyValidation(message?: string): CellValidation {
    return this.createRegexValidation(
      '^\\d+(\\.\\d{1,2})?$',
      '',
      message || '请输入有效的货币金额（最多两位小数）'
    )
  }

  static validateMultiple(value: any, validations: CellValidation[]): ValidationResult {
    for (const validation of validations) {
      const result = this.validate(value, validation)
      if (!result.isValid) {
        return result
      }
    }
    return { isValid: true }
  }
}