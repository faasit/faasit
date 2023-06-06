/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { ValidationChecks } from 'langium'
import { ast } from '@faasit/core'
import type { FaasitServices } from './faasit-module'

export function registerValidationChecks(services: FaasitServices) {
  const registry = services.validation.ValidationRegistry
  const validator = services.validation.FaasitValidator
  const checks: ValidationChecks<ast.FaasitAstType> = {}
  registry.register(checks, validator)
}

export class FaasitValidator {}
