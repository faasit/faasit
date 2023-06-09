/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { ValidationChecks, ValidationRegistry } from 'langium'
import { ast } from '..'
import type { FaasitServices } from './module'

export class FaasitValidationRegistry extends ValidationRegistry {
  constructor(services: FaasitServices) {
    super(services)
    const validator = services.validation.FaasitValidator
    const checks: ValidationChecks<ast.FaasitAstType> = {}
    this.register(checks, validator)
  }
}

export class FaasitValidator {}
