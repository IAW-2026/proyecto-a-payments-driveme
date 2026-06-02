-- CreateEnum
CREATE TYPE "TipoMetodoPago" AS ENUM ('TARJETA', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "MarcaTarjeta" AS ENUM ('VISA', 'MASTERCARD', 'AMEX', 'OTHER');

-- CreateEnum
CREATE TYPE "EstadoTransaccion" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "EstadoReembolso" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "EstadoFondoSemanal" AS ENUM ('ABIERTO', 'CERRADO', 'LIQUIDADO');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('PENDIENTE', 'PROCESADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "metodos_pago" (
    "id" TEXT NOT NULL,
    "idUsuario" TEXT NOT NULL,
    "tipo" "TipoMetodoPago" NOT NULL,
    "token" TEXT,
    "gatewayProvider" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarjetas" (
    "id" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "numeroEnmascarado" TEXT NOT NULL,
    "marca" "MarcaTarjeta" NOT NULL,
    "mesVencimiento" INTEGER NOT NULL,
    "anioVencimiento" INTEGER NOT NULL,
    "nombreTitular" TEXT NOT NULL,
    "direccionFacturacion" TEXT,
    "fechaAgregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarjetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fondos_semanales" (
    "id" TEXT NOT NULL,
    "idConductor" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "montoBruto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoRetenido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" "EstadoFondoSemanal" NOT NULL DEFAULT 'ABIERTO',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fondos_semanales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones" (
    "id" TEXT NOT NULL,
    "idViaje" TEXT NOT NULL,
    "idPasajero" TEXT NOT NULL,
    "idConductor" TEXT NOT NULL,
    "metodoPagoId" TEXT,
    "fondoSemanalId" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "estado" "EstadoTransaccion" NOT NULL DEFAULT 'PENDING',
    "gatewayProvider" TEXT,
    "gatewayTransactionId" TEXT,
    "detalleGateway" JSONB,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reembolsos" (
    "id" TEXT NOT NULL,
    "transaccionId" TEXT NOT NULL,
    "fondoSemanalId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoReembolso" NOT NULL DEFAULT 'PENDING',
    "razon" TEXT NOT NULL,
    "gatewayRefundId" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reembolsos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones" (
    "id" TEXT NOT NULL,
    "fondoSemanalId" TEXT NOT NULL,
    "idConductor" TEXT NOT NULL,
    "montoPagado" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'PENDIENTE',
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaEjecutada" TIMESTAMP(3),
    "detalle" JSONB,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarjetas_metodoPagoId_key" ON "tarjetas"("metodoPagoId");

-- CreateIndex
CREATE UNIQUE INDEX "fondos_semanales_idConductor_periodoInicio_key" ON "fondos_semanales"("idConductor", "periodoInicio");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_fondoSemanalId_key" ON "liquidaciones"("fondoSemanalId");

-- AddForeignKey
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_fondoSemanalId_fkey" FOREIGN KEY ("fondoSemanalId") REFERENCES "fondos_semanales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "transacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_fondoSemanalId_fkey" FOREIGN KEY ("fondoSemanalId") REFERENCES "fondos_semanales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_fondoSemanalId_fkey" FOREIGN KEY ("fondoSemanalId") REFERENCES "fondos_semanales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
