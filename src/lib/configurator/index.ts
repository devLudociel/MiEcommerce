export {
  normalizeConfigurator,
  migrateLegacyProduct,
  getUnitPrice,
  getSheetsNeeded,
  getSheetMatrixPrice,
  resolveConditionalAttributes,
  validateSheetMatrixPricing,
  validateConfigurator,
  convertTableToPricingMatrix,
  buildConfigurableProductFromTable,
  toConfiguratorV2,
  toLegacyCompatibilityConfigurator,
} from './engine';

export {
  normalizeTarjetasAcabadoOptionId,
  normalizeTarjetasSizeOptionId,
  validateTarjetasMatrixRules,
  unifyTarjetasPresentacionProducts,
} from './tarjetas';

export type { TarjetasSourceProduct } from './tarjetas';

export type {
  ConfiguratorValidationIssue,
  ConfiguratorValidationResult,
  ConvertTableToPricingMatrixOptions,
  PricingMatrixConversionResult,
  BuildConfigurableProductFromTableInput,
  ResolvedConditionalAttributeState,
  ConditionalAttributeResolutionResult,
} from './engine';
