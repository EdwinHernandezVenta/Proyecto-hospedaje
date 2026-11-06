CREATE DATABASE  IF NOT EXISTS `sistema_hospedaje` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `sistema_hospedaje`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: sistema_hospedaje
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auditoria`
--

DROP TABLE IF EXISTS `auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned DEFAULT NULL,
  `modulo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_id` int unsigned DEFAULT NULL,
  `detalle` json DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_modulo_fecha` (`modulo`,`fecha`),
  KEY `idx_auditoria_usuario` (`usuario_id`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria`
--

LOCK TABLES `auditoria` WRITE;
/*!40000 ALTER TABLE `auditoria` DISABLE KEYS */;
/*!40000 ALTER TABLE `auditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogo_auditoria`
--

DROP TABLE IF EXISTS `catalogo_auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogo_auditoria` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entidad` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_entidad` int unsigned DEFAULT NULL,
  `accion` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_usuario` int unsigned DEFAULT NULL,
  `detalles` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_catalogo_auditoria_entidad` (`entidad`,`id_entidad`),
  KEY `idx_catalogo_auditoria_usuario` (`id_usuario`),
  CONSTRAINT `fk_hab_catalogo_auditoria_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogo_auditoria`
--

LOCK TABLES `catalogo_auditoria` WRITE;
/*!40000 ALTER TABLE `catalogo_auditoria` DISABLE KEYS */;
/*!40000 ALTER TABLE `catalogo_auditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int unsigned DEFAULT NULL,
  `identificacion` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` bigint unsigned DEFAULT NULL,
  `direccion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clientes_identificacion` (`identificacion`),
  UNIQUE KEY `uq_clientes_correo` (`correo`),
  UNIQUE KEY `uq_clientes_id_usuario` (`id_usuario`),
  CONSTRAINT `fk_clientes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_cliente_correo` CHECK ((`correo` like _utf8mb4'%_@_%._%'))
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (9,NULL,'100111010','Darwin','10',NULL,NULL,'numerosdeluno@gmail.com',1,'2026-09-08 02:04:49','2026-09-25 05:12:59'),(13,3,'1000000001','Paie','Prime',NULL,NULL,'xcosas135@gmail.com',1,'2026-09-11 01:23:40','2026-09-30 05:15:47'),(37,64,'1045140302','Edwin','Hernandez',NULL,NULL,'eh7521140@gmail.com',1,'2026-09-22 02:46:16','2026-09-22 20:13:27'),(41,61,'71466009628561484956','Yanny','Valencia',NULL,NULL,'valenciayanny24@gmail.com',1,'2026-09-22 03:22:09','2026-09-22 03:22:09'),(42,65,'1152446324','Alejandra','Burgos',3116749507,'Carrera 80c# 30a 63','a02331264@gmail.com',1,'2026-09-22 20:24:06','2026-09-24 03:28:14'),(43,66,'1085262716','Frutiño','De mango',NULL,NULL,'arepaconquesito18@gmail.com',1,'2026-09-22 20:25:49','2026-10-01 18:51:52'),(45,68,'86293442359404838103','Aída','Castro Támara',NULL,NULL,'aidatamara58@gmail.com',1,'2026-09-28 20:12:34','2026-09-28 20:12:34'),(46,69,'69040126994854189275','thiago','Google',NULL,NULL,'thiagogarciaorozco5@gmail.com',1,'2026-09-28 20:14:04','2026-09-28 20:14:04');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_pagos`
--

DROP TABLE IF EXISTS `configuracion_pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_pagos` (
  `id` tinyint unsigned NOT NULL,
  `anticipo_porcentaje` decimal(5,2) NOT NULL DEFAULT '100.00',
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_pagos`
--

LOCK TABLES `configuracion_pagos` WRITE;
/*!40000 ALTER TABLE `configuracion_pagos` DISABLE KEYS */;
INSERT INTO `configuracion_pagos` VALUES (1,100.00,'2026-10-29 03:02:27');
/*!40000 ALTER TABLE `configuracion_pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `encuestas_feedback`
--

DROP TABLE IF EXISTS `encuestas_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `encuestas_feedback` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_huesped` int unsigned DEFAULT NULL,
  `id_cliente` int unsigned DEFAULT NULL,
  `calificacion` tinyint unsigned NOT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  `anonimo` tinyint(1) NOT NULL DEFAULT '0',
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_paquete` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_feedback_huesped` (`id_huesped`),
  KEY `fk_feedback_cliente` (`id_cliente`),
  KEY `idx_feedback_fecha` (`fecha`),
  KEY `idx_feedback_calificacion` (`calificacion`),
  KEY `idx_feedback_paquete` (`id_paquete`),
  CONSTRAINT `fk_feedback_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_feedback_huesped` FOREIGN KEY (`id_huesped`) REFERENCES `huespedes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_feedback_paquete_hospedaje` FOREIGN KEY (`id_paquete`) REFERENCES `paquetes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_feedback_calificacion` CHECK ((`calificacion` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `encuestas_feedback`
--

LOCK TABLES `encuestas_feedback` WRITE;
/*!40000 ALTER TABLE `encuestas_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `encuestas_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `habitacion_imagenes`
--

DROP TABLE IF EXISTS `habitacion_imagenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `habitacion_imagenes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_habitacion` int unsigned NOT NULL,
  `archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_original` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orden` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_habitacion_imagenes_habitacion` (`id_habitacion`),
  CONSTRAINT `fk_habitacion_imagenes_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `habitacion_imagenes`
--

LOCK TABLES `habitacion_imagenes` WRITE;
/*!40000 ALTER TABLE `habitacion_imagenes` DISABLE KEYS */;
INSERT INTO `habitacion_imagenes` VALUES (20,32,'habitacion-c7677359-1998-4f53-b48f-6bd233e4f66d.jpg','modern-luxury-bedroom-suite-bathroom-with-working-table.jpg',0,'2026-09-21 02:38:59'),(21,31,'habitacion-76135bc0-51d8-403b-bf07-96ac66e0a31b.jpg','luxury-bedroom-suite-resort-high-rise-hotel-with-working-table.jpg',0,'2026-09-21 02:39:09'),(22,30,'habitacion-7c1b13c2-0d16-4d7b-a949-d6c2234be018.jpg','gg.jpg',0,'2026-09-21 02:41:45'),(23,24,'habitacion-c07cfe26-f7c9-4b35-ad3d-5cf36a6341c2.jpg','1.jpg',0,'2026-09-21 02:45:09'),(24,23,'habitacion-d970e6e0-d4be-4391-9f2c-2162681bd72c.png','2.png',0,'2026-09-21 02:45:19'),(25,29,'habitacion-3f80defb-0c12-4d88-83e6-946b4f78d8a6.jpg','1.jpg',0,'2026-09-21 02:47:46'),(26,28,'habitacion-a17ddb50-dffd-4a99-a5b6-4c21b7cd74bc.jpg','2.jpg',0,'2026-09-21 02:47:55'),(27,25,'habitacion-317eaa52-4d55-42c2-ab06-23c5a8a52da5.jpg','3.jpg',0,'2026-09-21 02:48:04'),(28,27,'habitacion-bcea7286-2afa-4092-b51c-0718abf2ff31.jpg','4.jpg',0,'2026-09-21 02:48:12'),(34,47,'habitacion-83bb16cc-56a1-4a9d-9515-cc44983291d6.webp','OIP (22).webp',0,'2026-09-28 21:11:15');
/*!40000 ALTER TABLE `habitacion_imagenes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `habitacion_mobiliario`
--

DROP TABLE IF EXISTS `habitacion_mobiliario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `habitacion_mobiliario` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_habitacion` int unsigned NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('disponible','ocupado','mantenimiento','inhabilitado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'disponible',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mobiliario_habitacion` (`id_habitacion`),
  CONSTRAINT `fk_hab_mobiliario_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `habitacion_mobiliario`
--

LOCK TABLES `habitacion_mobiliario` WRITE;
/*!40000 ALTER TABLE `habitacion_mobiliario` DISABLE KEYS */;
INSERT INTO `habitacion_mobiliario` VALUES (1,31,'Televisor','Electrodoméstico','Televisor Smart TV','disponible','2026-09-22 17:13:39','2026-09-22 17:13:39');
/*!40000 ALTER TABLE `habitacion_mobiliario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `habitaciones`
--

DROP TABLE IF EXISTS `habitaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `habitaciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `numero_habitacion` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_habitacion` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_maxima` int unsigned NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `comodidades` text COLLATE utf8mb4_unicode_ci,
  `tarifa` decimal(12,2) NOT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('disponible','ocupada','inhabilitada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'disponible',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_habitacion_numero` (`numero_habitacion`),
  CONSTRAINT `chk_habitacion_capacidad` CHECK ((`capacidad_maxima` > 0)),
  CONSTRAINT `chk_habitacion_tarifa` CHECK ((`tarifa` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `habitaciones`
--

LOCK TABLES `habitaciones` WRITE;
/*!40000 ALTER TABLE `habitaciones` DISABLE KEYS */;
INSERT INTO `habitaciones` VALUES (23,'101','individual',1,'Habitación individual económica, ideal para viajes cortos de negocios','Cama Individual, Wi-Fi de alta velocidad, Aire acondicionado, Escritorio, Baño privado',50000.00,'Habitación libre de humo de tabaco','disponible','2026-09-21 01:48:25','2026-10-29 03:20:49'),(24,'102','individual',1,'Habitación sencilla y tranquila con vista al jardín interior','Cama Individual, TV Smart 32\", Armario, Aire acondicionado, Baño completo',55000.00,'Ubicada cerca de la recepción','disponible','2026-09-21 01:49:42','2026-10-29 04:12:01'),(25,'103','doble',2,'Alojamiento cómodo para parejas o dos personas en cama Queen Size','Cama Queen Size, Wi-Fi, Aire acondicionado, Minibar, TV Smart 43\", Caja fuerte',80000.00,'Incluye kit de aseo personal de bienvenida','disponible','2026-09-21 01:52:15','2026-10-29 04:12:13'),(27,'104','doble',2,'Habitación doble con dos camas individuales adaptada para amigos o colegas','2 Camas Individuales, Aire acondicionado, Escritorio de trabajo, TV Smart 40\", Baño privado',85000.00,'Posibilidad de unir las camas bajo solicitud','disponible','2026-09-21 01:54:42','2026-09-23 05:49:09'),(28,'105','doble',2,'Habitación doble amplia en segundo piso con balcón hacia la ciudad','Cama King Size, Balcón, Cafetera Nespresso, Wi-Fi, Smart TV 50\", Minibar',110000.00,'No se permiten mascotas en esta habitación','disponible','2026-09-21 02:11:15','2026-10-29 04:12:05'),(29,'201','doble',1,'Espacio doble acondicionado con cama adicional para familias pequeñas. ','1 Cama Matrimonial + 1 Cama Individual, Aire acondicionado, TV 43\", Mini refrigerador',120000.00,'Se puede añadir cuna de bebé sin cargo extra','disponible','2026-09-21 02:15:20','2026-10-16 23:19:34'),(30,'202','suite',2,'Suite espaciosa con área de estar independiente y acabados de lujo','Cama King Size, Sofá, Smart TV 55\", Jacuzzi privado, Cafetera, Bata de baño y pantuflas',180000.00,'Incluye copa de bienvenida al realizar el check-in','disponible','2026-09-21 02:16:28','2026-09-21 02:16:28'),(31,'203','suite',2,'Suite superior con panorámica de la ciudad y zona de trabajo integrada','Cama King Size, Escritorio amplio, Minibar surtido, Baño con tina de hidromasaje, TV 60\"',200000.00,'Acceso prioritario a las instalaciones del spa','disponible','2026-09-21 02:17:58','2026-10-02 22:01:34'),(32,'204','suite',4,'Suite familiar de lujo con dos ambientes separados para mayor privacidad','2 Camas King Size, Comedor, Terraza privada, 2 Smart TVs, Servicio a la habitación 24/7',280000.00,'Requiere depósito de garantía reembolsable','disponible','2026-09-21 02:19:07','2026-10-05 03:19:34'),(47,'107','individual',1,'Habitación sencilla y económica, diseñada para mochileros o viajeros con presupuesto ajustado','Cama individual, ventilador de techo, Wi-Fi gratuito, mesa de noche y baño compartido externo',90000.00,'Cerca de la zona de lavandería','disponible','2026-09-28 20:40:43','2026-10-05 03:19:14'),(56,'600','no se',12,'DARWIN','nun, l, k',500000.00,'SW','disponible','2026-10-05 01:58:50','2026-10-16 23:19:42');
/*!40000 ALTER TABLE `habitaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `huespedes`
--

DROP TABLE IF EXISTS `huespedes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `huespedes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `documento` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departamento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `celular` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_reserva` int unsigned NOT NULL,
  `estado` enum('Check-in','Check-out','En Estancia','Reserva Cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Check-in',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_huesped_documento` (`documento`),
  KEY `idx_huesped_reserva` (`id_reserva`),
  KEY `idx_huesped_estado` (`estado`),
  KEY `idx_huesped_nombre` (`nombres`,`apellidos`),
  CONSTRAINT `fk_huesped_reserva` FOREIGN KEY (`id_reserva`) REFERENCES `reservas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `huespedes`
--

LOCK TABLES `huespedes` WRITE;
/*!40000 ALTER TABLE `huespedes` DISABLE KEYS */;
/*!40000 ALTER TABLE `huespedes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `informes`
--

DROP TABLE IF EXISTS `informes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `informes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tipo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filtros` json DEFAULT NULL,
  `formato` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `archivo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generado_por` int unsigned DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_informe_usuario` (`generado_por`),
  KEY `idx_informes_tipo_fecha` (`tipo`,`fecha`),
  CONSTRAINT `fk_informe_usuario` FOREIGN KEY (`generado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `informes`
--

LOCK TABLES `informes` WRITE;
/*!40000 ALTER TABLE `informes` DISABLE KEYS */;
/*!40000 ALTER TABLE `informes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mobiliario`
--

DROP TABLE IF EXISTS `mobiliario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mobiliario` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_habitacion` int unsigned NOT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mobiliario_habitacion` (`id_habitacion`),
  CONSTRAINT `fk_mobiliario_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mobiliario`
--

LOCK TABLES `mobiliario` WRITE;
/*!40000 ALTER TABLE `mobiliario` DISABLE KEYS */;
/*!40000 ALTER TABLE `mobiliario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modulos`
--

DROP TABLE IF EXISTS `modulos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modulos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_modulo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_modulos_nombre` (`nombre_modulo`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modulos`
--

LOCK TABLES `modulos` WRITE;
/*!40000 ALTER TABLE `modulos` DISABLE KEYS */;
INSERT INTO `modulos` VALUES (1,'Roles','2026-09-07 04:13:12'),(2,'Usuarios','2026-09-07 04:13:12'),(3,'Habitaciones','2026-09-07 04:13:12'),(4,'Servicios','2026-09-07 04:13:12'),(5,'Paquetes','2026-09-07 04:13:12'),(6,'Clientes','2026-09-07 04:13:12'),(7,'Reservas','2026-09-07 04:13:12'),(8,'Huéspedes','2026-09-07 04:13:12'),(9,'Feedback','2026-09-07 04:13:12'),(10,'Dashboard','2026-09-07 04:13:12'),(11,'Informes','2026-09-07 04:13:12');
/*!40000 ALTER TABLE `modulos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagos`
--

DROP TABLE IF EXISTS `pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_reserva` int unsigned NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `metodo_pago` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `comprobante_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('pendiente','confirmado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `concepto` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia_externa` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wompi_transaction_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_confirmacion` datetime DEFAULT NULL,
  `registrado_por` int DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pagos_referencia_externa` (`referencia_externa`),
  KEY `idx_pagos_reserva` (`id_reserva`),
  KEY `idx_pagos_estado` (`estado`),
  KEY `idx_pagos_fecha` (`fecha`),
  CONSTRAINT `fk_pago_reserva` FOREIGN KEY (`id_reserva`) REFERENCES `reservas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_pago_valor` CHECK ((`valor` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos`
--

LOCK TABLES `pagos` WRITE;
/*!40000 ALTER TABLE `pagos` DISABLE KEYS */;
INSERT INTO `pagos` VALUES (102,113,480000.00,'efectivo','/uploads/comprobante-pago-113-102-1793244073629.pdf','confirmado','2026-10-29 03:21:13',NULL,NULL,NULL,'2026-10-28 22:21:13',NULL,NULL);
/*!40000 ALTER TABLE `pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paquete_imagenes`
--

DROP TABLE IF EXISTS `paquete_imagenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paquete_imagenes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_paquete` int unsigned NOT NULL,
  `archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_original` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paquete_imagenes_paquete` (`id_paquete`),
  CONSTRAINT `fk_paquete_imagenes_paquete` FOREIGN KEY (`id_paquete`) REFERENCES `paquetes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paquete_imagenes`
--

LOCK TABLES `paquete_imagenes` WRITE;
/*!40000 ALTER TABLE `paquete_imagenes` DISABLE KEYS */;
INSERT INTO `paquete_imagenes` VALUES (6,10,'paquete-19988a3b-d522-4efa-976d-a43755021f13.jpg','S.jpg',0,'2026-09-24 06:53:49'),(7,9,'paquete-e3855cdb-d637-4b10-a90e-a39459675f82.jpg','C.jpg',0,'2026-09-24 06:54:00'),(8,1,'paquete-235236d3-9be8-4a71-9411-6d78c8d61979.jpg','P.jpg',0,'2026-09-24 06:54:07'),(9,25,'paquete-08009837-f8fa-4ba8-84f2-d3fc4dd52103.jpg','pexels-jesus-toledo-339539791-19887942.jpg',0,'2026-09-28 21:12:28'),(10,24,'paquete-05568f54-f37e-4ee6-ad2b-e7245bbea362.jpg','pexels-kelly-11815582.jpg',0,'2026-09-28 21:14:29'),(14,23,'paquete-68717b60-fc0d-4b32-a89b-ee7d4445a63f.jpg','pexels-clive-kim-2523249-4150118.jpg',0,'2026-09-28 21:16:22'),(15,27,'paquete-a31e5118-2e51-4732-b871-b43a32d9341d.jpg','pexels-jose-fernandez-248512161-13355515.jpg',0,'2026-09-28 21:22:12'),(17,11,'paquete-9924d02e-b128-4792-b98f-dbc32c623e99.jpg','pexels-jess-londono-47825207-15699623.jpg',0,'2026-09-28 21:27:05'),(18,12,'paquete-fd5a8b38-678a-417f-8ed0-f53e72e50632.jpg','pexels-lasfotosdepipe-32351609.jpg',0,'2026-09-28 21:32:52'),(19,26,'paquete-88c02d2e-69a5-4e0c-8763-ae4d9023a0c3.jpg','pexels-yoendry-13209625.jpg',0,'2026-09-28 21:36:41'),(30,16,'paquete-9a7de101-07df-4fea-8932-7272a3ea0653.jpg','pexels-ariel-foletto-2999027-13767911.jpg',10,'2026-09-28 21:38:22'),(32,19,'paquete-67667e8b-df43-441e-b535-ddad9b5b5767.jpg','pexels-juanjosedz-8345945.jpg',0,'2026-09-28 21:41:35');
/*!40000 ALTER TABLE `paquete_imagenes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paquete_opciones`
--

DROP TABLE IF EXISTS `paquete_opciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paquete_opciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_paquete` int unsigned NOT NULL,
  `componente` enum('alojamiento','transporte','actividad','excursion','servicio') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo_base` decimal(12,2) NOT NULL DEFAULT '0.00',
  `margen_ganancia` decimal(12,2) NOT NULL DEFAULT '0.00',
  `precio` decimal(12,2) NOT NULL DEFAULT '0.00',
  `capacidad` int unsigned NOT NULL DEFAULT '1',
  `disponibilidad` tinyint(1) NOT NULL DEFAULT '1',
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paquete_opciones_paquete` (`id_paquete`),
  CONSTRAINT `fk_hab_paquete_opciones` FOREIGN KEY (`id_paquete`) REFERENCES `paquetes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paquete_opciones`
--

LOCK TABLES `paquete_opciones` WRITE;
/*!40000 ALTER TABLE `paquete_opciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `paquete_opciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paquete_servicios`
--

DROP TABLE IF EXISTS `paquete_servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paquete_servicios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_paquete` int unsigned NOT NULL,
  `id_servicio` int unsigned DEFAULT NULL,
  `id_habitacion` int unsigned DEFAULT NULL,
  `cantidad` int unsigned NOT NULL DEFAULT '1',
  `precio_componente` decimal(12,2) NOT NULL DEFAULT '0.00',
  `condicion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ps_paquete` (`id_paquete`),
  KEY `idx_ps_servicio` (`id_servicio`),
  KEY `idx_ps_habitacion` (`id_habitacion`),
  CONSTRAINT `fk_ps_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitaciones` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ps_paquete` FOREIGN KEY (`id_paquete`) REFERENCES `paquetes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ps_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_ps_cantidad` CHECK ((`cantidad` > 0)),
  CONSTRAINT `chk_ps_precio` CHECK ((`precio_componente` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paquete_servicios`
--

LOCK TABLES `paquete_servicios` WRITE;
/*!40000 ALTER TABLE `paquete_servicios` DISABLE KEYS */;
INSERT INTO `paquete_servicios` VALUES (1,1,NULL,NULL,1,30000.00,'Incluido en el paquete'),(2,1,NULL,NULL,1,80000.00,'Incluido en el paquete');
/*!40000 ALTER TABLE `paquete_servicios` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_paquete_servicios_bi` BEFORE INSERT ON `paquete_servicios` FOR EACH ROW BEGIN
    IF (NEW.id_servicio IS NULL AND NEW.id_habitacion IS NULL)
       OR (NEW.id_servicio IS NOT NULL AND NEW.id_habitacion IS NOT NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Un componente de paquete debe ser un servicio o una habitacion, no ambos';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_paquete_servicios_bu` BEFORE UPDATE ON `paquete_servicios` FOR EACH ROW BEGIN
    IF (NEW.id_servicio IS NULL AND NEW.id_habitacion IS NULL)
       OR (NEW.id_servicio IS NOT NULL AND NEW.id_habitacion IS NOT NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Un componente de paquete debe ser un servicio o una habitacion, no ambos';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `paquetes`
--

DROP TABLE IF EXISTS `paquetes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paquetes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `precio` decimal(12,2) NOT NULL DEFAULT '0.00',
  `servicios_incluidos` text COLLATE utf8mb4_unicode_ci,
  `itinerario` text COLLATE utf8mb4_unicode_ci,
  `tipo_viaje` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `disponibilidad` int unsigned NOT NULL DEFAULT '0',
  `estado` enum('activo','inactivo','agotado','en_promocion') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `imagenes` text COLLATE utf8mb4_unicode_ci,
  `destino` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condiciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paquetes_nombre` (`nombre`),
  KEY `idx_paquetes_destino` (`destino`),
  KEY `idx_paquetes_estado` (`estado`),
  KEY `idx_paquetes_precio` (`precio`),
  CONSTRAINT `chk_paquete_precio` CHECK ((`precio` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paquetes`
--

LOCK TABLES `paquetes` WRITE;
/*!40000 ALTER TABLE `paquetes` DISABLE KEYS */;
INSERT INTO `paquetes` VALUES (1,'Plan Ejecutivo Express','Optimizado para viajes de trabajo rápidos que requieren comodidad, conectividad de alta velocidad y espacios tranquilos para reuniones',220000.00,'Desayuno ejecutivo, Uso del Business Center por 3 horas, Servicio de lavandería express (2 prendas), Traslado VIP','Día 1: Check-in express y acceso a salas de reuniones. Día 2: Desayuno, uso de instalaciones y transporte al aeropuerto','Negocios ',NULL,NULL,1,'activo',NULL,'Ciudad de Panamá, Panamá','Aplica únicamente de lunes a viernes. Requerida confirmación previa de horario de traslado','2026-09-07 04:13:12','2026-09-20 22:57:42'),(9,'Escapada Romántica Premium','Disfruta de una experiencia inolvidable en pareja con atención personalizada, cena a la luz de las velas y acceso exclusivo a nuestras áreas de relax',450000.00,'Desayuno buffet diario, Cenas de 3 tiempos, Acceso al Spa, Botella de vino de bienvenida, Masaje en pareja (45 min)','Día 1: Check-in VIP y cena romántica. Día 2: Sesión de Spa y tour guiado. Día 3: Desayuno en la habitación y Late Check-out','Parejas',NULL,NULL,1,'activo',NULL,'Cancún, México','Reserva con mínimo 48 horas de anticipación. No reembolsable en cancellations a menos de 24 horas del check-in. Válido para 2 personas.','2026-09-20 22:35:17','2026-09-21 01:44:58'),(10,'Aventura Familiar Total','Un paquete diseñado para el entretenimiento de toda la familia, incluyendo actividades al aire libre y transporte interno gratis',780000.00,'Alojamiento familiar, Pase de acceso al parque acuático, Transporte aeropuerto-hotel, Kid\'s Club guiado ','Día 1: Bienvenida y entrega de kits infantiles. Día 2: Excursión al parque natural. Día 3: Taller de cocina local. Día 4: Check-out','Familiar',NULL,NULL,1,'activo',NULL,'San Andrés, Colombia','Válido para hasta 2 adultos y 2 niños menores de 12 años. Sujeto a disponibilidad de habitaciones familiares','2026-09-20 23:07:46','2026-09-24 05:28:05'),(11,'Aventura Cafetera en Familia','Un recorrido por el corazón del Eje Cafetero diseñado para que grandes y chicos disfruten del campo. Incluye caminatas suaves, contacto con la naturaleza y aprendizaje sobre el proceso del café, todo con transporte interno incluido',850000.00,'Alojamiento en finca hotel,\n\nDesayunos y almuerzos típicos,\n\nTransporte interno,\n\nEntrada al Valle del Cocora,\n\nGuía local certificado','Día 1: Llegada a Salento, check-in en finca hotel y tarde libre para explorar el pueblo.  Día 2: Caminata ecológica en el Valle del Cocora y almuerzo típico.  Día 3: Tour de la cultura cafetera (recolección y procesamiento) y taller de tejidos.  Día 4: Desayuno, check-out y traslado al aeropuerto.','Familiar / Naturaleza',NULL,NULL,1,'activo',NULL,'Salento, Quindío, Colombia','Válido para hasta 2 adultos y 2 niños menores de 10 años. No incluye vuelos nacionales. Sujeto a clima y disponibilidad de fincas\n\n','2026-09-28 20:33:32','2026-09-28 20:40:11'),(12,'Vacaciones Soleadas en el Caribe','Escápate a las playas del Caribe colombiano con un plan que combina descanso y diversión. Ideal para familias que buscan sol, mar y actividades recreativas sin salir de la ciudad',920000.00,'Alojamiento frente al mar,\n\nDesayuno buffet diario,\n\nTransporte aeropuerto-hotel,\n\nPaseo en lancha por la bahía,\n\nAcceso a piscina infantil','Día 1: Recepción en el aeropuerto, traslado al hotel y tarde de playa.  Día 2: Tour acuático por la Bahía de Santa Marta (avistamiento de delfines).  Día 3: Día libre para disfrutar de la piscina o ir a Playa Blanca.  Día 4: Desayuno, check-out y traslado al aeropuerto','Familiar / Playa',NULL,NULL,1,'activo',NULL,'Santa Marta, Magdalena, Colombia','Válido para hasta 2 adultos y 2 niños menores de 12 años. Tarifa sujeta a cambios sin previo aviso. No incluye gastos no especificados','2026-09-28 20:44:07','2026-09-28 20:44:41'),(13,'Ruta por Pueblos Patrimonio','Un viaje al pasado para conocer la arquitectura colonial y los paisajes desérticos de Boyacá. Un plan educativo y relajado perfecto para compartir en familia y aprender sobre la historia de Colombia',790000.00,'Alojamiento en hotel boutique,\n\nDesayunos diarios,\n\nTransporte terrestre interno,\n\nEntradas a museos,\n\nTaller de manualidades para niños','Día 1: Llegada a Villa de Leyva, caminata por la Plaza Mayor y check-in.  Día 2: Visita al Desierto de la Candelaria y el Paleontológico.  Día 3: Tour al Museo del Fósil y taller de cerámica para niños.  Día 4: Desayuno, check-out y traslado a la terminal o aeropuerto.','Familiar / Cultural',NULL,NULL,1,'activo',NULL,'Villa de Leyva, Boyacá, Colombia','Válido para hasta 2 adultos y 2 niños menores de 12 años. Precio basado en ocupación doble. No aplica para temporadas altas (Semana Santa y diciembre)','2026-09-28 20:47:02','2026-09-28 21:06:10'),(14,'Escapada Romántica en Cartagena','Disfruta de la magia de la ciudad amurallada con un toque de lujo. Incluye cena romántica para los padres y un servicio de niñera certificada para que puedan disfrutar de una noche sola, mientras los niños duermen seguros',1350000.00,'Alojamiento en hotel boutique,\n\nDesayunos diarios,\n\nCena romántica (solo adultos),\n\nServicio de niñera (4 horas),\n\nTour en coche por la ciudad,\n\nTransporte aeropuerto-hotel','Día 1: Llegada, check-in en hotel boutique en el centro histórico y paseo en coche.  Día 2: Tour guiado por la ciudad amurallada y taller de cocina caribeña para niños.  Día 3: Día libre en la playa. Noche: Cena romántica para adultos y niñera para niños.  Día 4: Desayuno, check-out y traslado al aeropuerto','Romance / Familiar',NULL,NULL,1,'activo',NULL,'Cartagena, Bolívar, Colombia','Válido para hasta 2 adultos y 2 niños menores de 10 años. La cena romántica y el servicio de niñera deben reservarse con 48 horas de antelación. No incluye vuelos. No aplica para puentes festivos','2026-09-28 20:54:38','2026-09-28 21:07:43'),(15,'Expedición Ecológica al Amazonas','Una experiencia única de conexión con la selva amazónica. Visita comunidades indígenas, avistamiento de aves y delfines rosados, y caminatas interpretativas por la selva. Ideal para familias que aman la naturaleza y quieren enseñar a sus hijos sobre la conservación',1050000.00,'Alojamiento en lodge ecológico,\n\nAlimentación completa (3 comidas),\n\nTransporte fluvial y terrestre,\n\nGuía especializado en selva,\n\nEntradas a comunidades,\n\nBotas de caucho para caminatas','Día 1: Llegada a Leticia, check-in y caminata nocturna de reconocimiento.  Día 2: Excursión a la Isla de los Micos y avistamiento de delfines rosados.  Día 3: Visita a comunidad indígena y taller de artesanías.  Día 4: Desayuno, check-out y traslado al aeropuerto.',' Ecoturismo / Familiar',NULL,NULL,1,'activo',NULL,'Leticia, Amazonas, Colombia','Válido para hasta 2 adultos y 2 niños mayores de 6 años. Se requiere esquema de vacunación contra fiebre amarilla. No incluye vuelos. Sujeto a disponibilidad de cupos en lodges','2026-09-28 20:58:21','2026-09-28 21:07:24'),(16,'Experiencia de Lujo','Una experiencia exclusiva con servicios personalizados y atención durante toda la estadía.\nServicios incluidos: Suite, desayuno, cena, transporte privado y spa',680000.00,'Suite, desayuno, cena, transporte privado y spa','Transporte → check-in → spa → cena → desayuno → check-out','Pareja',NULL,NULL,1,'activo',NULL,'Cartagena, Colombia','Requiere reserva anticipada','2026-09-28 21:00:40','2026-09-28 21:03:04'),(17,'Diversión Total en Parques Temáticos','Un plan lleno de adrenalina visitando los mejores parques del Eje Cafetero. Ideal para familias con niños que aman las atracciones mecánicas, el contacto con la naturaleza y los espectáculos en vivo',1250000.00,'Alojamiento en hotel campestre,\n\nDesayunos diarios,\n\nEntradas a Parque del Café,\n\nEntradas a PANACA,\n\nTransporte interno,\n\nGuía acompañante','Día 1: Llegada, check-in y tarde libre en Salento.  Día 2: Día completo en Parque del Café (atracciones y shows).  Día 3: Día completo en PANACA (parque agropecuario).  Día 4: Desayuno, check-out y traslado al aeropuerto.','Familiar / Diversión',NULL,NULL,1,'activo',NULL,'Quindío, Colombia','Válido para hasta 2 adultos y 2 niños menores de 12 años. No incluye almuerzos ni cenas en los parques. No incluye vuelos. Sujeto a horarios de los parques','2026-09-28 21:00:58','2026-09-28 21:02:57'),(18,'Sabores de Colombia','Un recorrido gastronómico para descubrir sabores tradicionales y propuestas culinarias de la región',0.00,'Desayuno, cena gastronómica, degustación y recorrido culinario','Check-in → degustación → recorrido gastronómico → cena','Pareja',NULL,NULL,1,'activo',NULL,'Cartagena, Colombia','Algunas actividades requieren reserva previa','2026-09-28 21:02:25','2026-09-28 21:02:45'),(19,'Ruta de la Fe por Boyacá','Un recorrido espiritual por los templos más emblemáticos de la región. Ideal para familias que buscan un viaje de recogimiento, historia y tradición, visitando santuarios y participando en ceremonias religiosas',720000.00,'Alojamiento en hotel céntrico,\n\nDesayunos diarios,\n\nTransporte interno,\n\nGuía espiritual,\n\nEntradas a templos,\n\nAcompañamiento permanente','Día 1: Llegada a Tunja, check-in y visita a la Catedral Basílica.  Día 2: Excursión al Santuario de la Virgen de la Peña en Sogamoso.  Día 3: Visita al Monasterio de la Candelaria y tarde de reflexión.  Día 4: Desayuno, check-out y traslado a la terminal.','Religioso / Cultural',NULL,NULL,1,'activo',NULL,'Boyacá, Colombia','Válido para hasta 2 adultos y 2 niños menores de 12 años. No incluye vuelos. Se recomienda vestimenta adecuada para los templos. No aplica para Semana Santa','2026-09-28 21:03:40','2026-09-28 21:06:42'),(20,'Montañas de los Andes','Un viaje para disfrutar de paisajes montañosos, naturaleza y actividades al aire libre',390000.00,'Transporte, alojamiento, desayuno y caminata guiada','Llegada → caminata → recorrido natural → cena → salida','Grupo',NULL,NULL,1,'activo',NULL,'Salento, Colombia','Se recomienda llevar ropa y calzado adecuado','2026-09-28 21:05:12','2026-09-28 21:05:20'),(21,' Encuentro con las Ballenas Jorobadas','Vive la experiencia única de ver ballenas jorobadas en su hábitat natural. Un plan ecológico que combina playa, selva y avistamiento de fauna marina, perfecto para familias amantes de la naturaleza',1450000.00,'Alojamiento en eco-lodge,\n\nAlimentación completa (3 comidas),\n\nTour de avistamiento,\n\nTransporte marítimo,\n\nGuía naturalista,\n\nBotas de caucho','Día 1: Llegada a Bahía Solano, check-in y tarde de playa.  Día 2: Tour de avistamiento de ballenas (temporada julio-octubre).  Día 3: Caminata ecológica por la selva y visita a cascadas.  Día 4: Desayuno, check-out y traslado al aeropuerto.','Ecoturismo / Aventura',NULL,NULL,1,'activo',NULL,'Bahía Solano, Chocó, Colombia','Válido para hasta 2 adultos y 2 niños mayores de 6 años. Solo disponible en temporada de ballenas (julio a octubre). No incluye vuelos. Se requiere vacuna de fiebre amarilla.','2026-09-28 21:05:49','2026-09-28 21:06:28'),(22,'Encanto Colonial','Recorrido cultural por calles históricas, arquitectura colonial y gastronomía tradicional',360000.00,'Alojamiento, desayuno, guía turístico y recorrido histórico','Check-in → recorrido histórico → gastronomía → tiempo libre','Pareja',NULL,NULL,1,'activo',NULL,'Cartagena, Colombia','Recorrido sujeto a horarios establecidos','2026-09-28 21:06:41','2026-09-28 21:06:48'),(23,'Primavera en Medellín','Una experiencia urbana para conocer lugares culturales, gastronómicos y naturales de la ciudad',340000.00,'Alojamiento, desayuno, transporte y tour urbano','Llegada → tour urbano → recorrido gastronómico → desayuno','Individual',NULL,NULL,1,'activo',NULL,'Medellín, Colombia','Algunas actividades requieren reserva previa','2026-09-28 21:08:40','2026-09-28 21:08:46'),(24,'Sabor y Cultura en Cali','Un viaje para los amantes de la buena comida. Recorre los mercados, aprende a preparar platos típicos del Pacífico y disfruta de la mejor salsa y gastronomía caleña en un ambiente familiar',880000.00,'Habitación 600','Día 1: Llegada, check-in y cena típica de bienvenida.  Día 2: Tour gastronómico por el mercado de Siloé y clase de cocina.  Día 3: Ruta de la salsa y degustación de dulces tradicionales.  Día 4: Desayuno, check-out y traslado al aeropuerto.','Gastronómico / Cultural',NULL,NULL,1,'activo',NULL,' Cali, Valle del Cauca, Colombia','Válido para hasta 2 adultos y 2 niños menores de 12 años. No incluye vuelos. Informar alergias alimentarias al momento de la reserva','2026-09-28 21:09:38','2026-10-16 23:19:42'),(25,'Colores de México','Una experiencia cultural para descubrir la gastronomía, arquitectura y tradiciones mexicanas',1850000.00,'Alojamiento, desayuno, transporte y tour cultural','Llegada → centro histórico → gastronomía → recorrido cultural','Grupo',NULL,NULL,1,'activo',NULL,'Ciudad de México, México','No incluye gastos personales','2026-09-28 21:10:12','2026-09-28 21:10:19'),(26,'Magia y Color en La Guajira','Descubre el desierto, el mar y la cultura wayuu en un solo viaje. Un plan lleno de contrastes, atardeceres únicos y experiencias inolvidables en el punto más septentrional de Colombia',950000.00,'Alojamiento en ranchería (2 noches),\n\nAlimentación completa,\n\nTransporte 4x4,\n\nGuía wayuu,\n\nEntradas a sitios turísticos,\n\nHamacas o camas','Día 1: Llegada a Riohacha, check-in y tarde libre.  Día 2: Traslado a Cabo de la Vela, visita al Pilón de Azúcar.  Día 3: Tour a las Salinas de Manaure y playa Arrecifes.  Día 4: Desayuno, check-out y traslado a Riohacha.','Aventura / Cultural',NULL,NULL,1,'activo',NULL,'Cabo de la Vela, La Guajira, Colombia','Válido para hasta 2 adultos y 2 niños mayores de 8 años. No incluye vuelos. Se recomienda llevar protector solar y ropa fresca. Sujeto a clima','2026-09-28 21:12:57','2026-09-28 21:13:08'),(27,'Shopping y Moda en Medellín','Un plan diseñado para los amantes de la moda. Visita los mejores centros comerciales, outlets y zonas de diseño de la ciudad, con tiempo libre para compras y disfrutar de la vida nocturna',820000.00,'Asistencia Médica Básica, Habitación 504, N.º 504','Día 1: Llegada, check-in y tarde libre en El Poblado.  Día 2: Tour de compras por centros comerciales (Santafé, Oviedo).  Día 3: Visita a outlets y taller de moda sostenible.  Día 4: Desayuno, check-out y traslado al aeropuerto.','Compras / Urbano',NULL,NULL,1,'activo',NULL,'Medellín, Antioquia, Colombia',' Válido para hasta 2 adultos y 2 niños menores de 12 años. No incluye vuelos. No incluye dinero para compras. Sujeto a disponibilidad de hoteles','2026-09-28 21:16:08','2026-10-01 18:34:46'),(28,'Vida de Granja en Familia','Una experiencia auténtica de campo donde los niños aprenderán a ordeñar vacas, recoger huevos y sembrar. Ideal para desconectar de la ciudad y reconectar con la naturaleza en un ambiente seguro',690000.00,'Alojamiento en cabañas,\n\nAlimentación completa,\n\nActividades de granja,\n\nTaller de panadería,\n\nTransporte desde Bogotá,\n\nGuía de granja, Habitacion 201, Zona de Juegos','Día 1: Llegada a la granja, check-in y recorrido guiado.  Día 2: Actividades de granja (ordeño, alimentar animales).  Día 3: Caminata al embalse de Tominé y taller de panadería.  Día 4: Desayuno, check-out y traslado a Bogotá.','Rural / Familiar',NULL,NULL,1,'activo',NULL,'Guatavita, Cundinamarca, Colombia','Válido para hasta 2 adultos y 2 niños menores de 12 años. No incluye vuelos. Se recomienda llevar ropa cómoda y botas. Sujeto a clima','2026-09-28 21:23:39','2026-10-16 23:19:34');
/*!40000 ALTER TABLE `paquetes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int unsigned NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiracion` datetime NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_reset_token` (`token`),
  KEY `idx_password_reset_usuario` (`id_usuario`),
  KEY `idx_password_reset_expiracion` (`expiracion`),
  CONSTRAINT `fk_password_reset_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permisos_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` VALUES (1,'ver','Consultar información','2026-09-07 04:13:12'),(2,'crear','Crear registros','2026-09-07 04:13:12'),(3,'editar','Editar registros','2026-09-07 04:13:12'),(4,'eliminar','Eliminar registros','2026-09-07 04:13:12'),(5,'exportar','Exportar información','2026-09-07 04:13:12'),(6,'confirmar_pago','Confirmar o rechazar pagos','2026-09-07 04:13:12'),(7,'gestionar_roles','Gestionar roles y permisos','2026-09-07 04:13:12'),(8,'gestionar_usuarios','Gestionar usuarios','2026-09-07 04:13:12'),(9,'gestionar_reservas','Gestionar reservas','2026-09-07 04:13:12');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int unsigned NOT NULL,
  `session_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expira_en` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_refresh_usuario` (`id_usuario`),
  KEY `idx_refresh_expira` (`expira_en`),
  KEY `idx_refresh_tokens_session` (`session_id`),
  CONSTRAINT `fk_refresh_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (1,3,'86ad11e0-92c2-4501-b2f0-1b7c8263e7df','36d840bc6a6e40aa76a4040a68d1ae783c9c5f3b0b85d4195b5ff10b052d293d','2026-09-25 14:08:01','2026-09-18 14:09:05','2026-09-18 19:08:01'),(2,3,'b3a6d176-46bb-4d91-bad5-4bbe042bcf3c','fa436dcccd2be8eb99400f01a0780300fa8c7f925b4d524c88fdd76591ca8056','2026-09-25 14:08:16','2026-09-18 14:09:05','2026-09-18 19:08:15'),(3,3,'c5f1e3eb-9f88-41f9-8a41-222f713be2be','c2029f966b0ccac1ae425781afdffbe5121ab6438eeb05f582d879782a1b874d','2026-09-25 14:09:16','2026-09-18 14:09:56','2026-09-18 19:09:15'),(4,1,'e0e5925a-080e-49c8-bf8e-a0a462d7b701','529bc5b2b4a1419fc04171411cd566dfbb016be176f86852d5cbb5ff3a7c3173','2026-09-25 14:10:04','2026-09-18 14:10:24','2026-09-18 19:10:03'),(5,1,'80ce5d19-503e-485d-a8b7-7afb76e5dfb3','a5be0c25674b23718185ccce2c25c36c080990bfe07883cb58baf05a90753ad7','2026-09-25 14:15:14','2026-09-18 14:16:32','2026-09-18 19:15:13'),(7,3,'1e70c18c-4739-4063-9922-c9520f595c7a','4b9ab2fffd2a752fe1a9245a84530bad178e045be58f3d9fc899eec02755d508','2026-09-25 14:21:56','2026-09-18 14:22:44','2026-09-18 19:21:56'),(8,1,'18901793-b872-4171-a31c-5058e0354892','6fedef0cd20737ac07ef0b4e26b2cc9419b4239e6ff50a2f38353f68280463a7','2026-09-25 14:26:45','2026-09-18 15:36:24','2026-09-18 19:26:44'),(9,3,'76cdba72-b12c-4558-aace-0a052d9c0fa1','37ffbe5ae0ef6cbe5c5a23c045b20802f5d7494868b1e071a160e78d975028a9','2026-09-25 14:32:20','2026-09-18 14:41:39','2026-09-18 19:32:20'),(10,3,'6aafc2a7-b846-4086-af66-07c9c473f57c','3de1575cd9452a510c9095fe253b5f5243199b44d5b7d924a6e32542fa14d729','2026-09-25 14:36:12','2026-09-18 14:41:39','2026-09-18 19:36:12'),(11,3,'2b739da1-fb57-4e9a-a95f-b3f720469200','d1f5b6d4fd70592b16eed65adf72a06aeb01374605b428a158c385363bd3a21b','2026-09-25 14:41:34','2026-09-18 14:41:39','2026-09-18 19:41:33'),(12,3,'9fae18b4-7f96-4282-9169-6919812b4fdb','6d17d28db56957ad321067c79d48e36dc4218d2fcc026a7a9f19dbc045d68690','2026-09-25 14:41:51','2026-09-18 15:40:26','2026-09-18 19:41:50'),(14,1,'982dcade-aa8e-4051-a12b-64ddceaf1030','49d0f5106eed9c36152966142ff1e3fdebdce9aadb90b31ce8abbf97716ab5a5','2026-09-25 14:49:11','2026-09-18 15:36:24','2026-09-18 19:49:10'),(17,1,'ca2af144-f3ad-4fd7-8ea2-181631a62b61','056cf36a8f351757ecd4f198af877fc51fc3ee39084fe5ac2a17f0b852fe079a','2026-09-25 15:15:22','2026-09-18 15:36:24','2026-09-18 20:15:22'),(18,1,'9e38b725-ade9-4836-8cea-eceed73a4017','19f230e60528aad4a6b18e8b9918645dfc5a58b449de2e09d2ef79f5b946c18c','2026-09-25 15:36:35','2026-09-18 15:36:56','2026-09-18 20:36:34'),(19,3,'bea70188-f180-480d-8a55-05fa2c9a3ec4','d974a70d818bccc63bef07f539d911e8836036c3b378e8b39085bc3977d71e55','2026-09-25 15:37:04','2026-09-18 15:40:26','2026-09-18 20:37:03'),(20,1,'36cd52bd-e277-4d10-8b12-40369ae8e168','59b0f5386accd5ad48f978e598fcfb13b817c15afea74f98b089559677f2b441','2026-09-25 15:40:33','2026-09-18 16:12:10','2026-09-18 20:40:33'),(21,3,'d2b5d764-8cbc-4399-9519-cf1104ab93d6','16ad5a67ce2302f142ff1ffeca93bc08c93d4af49a5d40b7f8f78e3bc369d30e','2026-09-25 15:46:01','2026-09-18 16:27:34','2026-09-18 20:46:01'),(22,1,'36cd52bd-e277-4d10-8b12-40369ae8e168','3ad137710129975e0b3619a72a48037e7f880e6e4279a52b2599e01100bc74a0','2026-09-25 16:12:11','2026-09-18 16:47:30','2026-09-18 21:12:10'),(23,1,'e952be99-dc70-436b-af31-9380af84315d','7444d454f23226006e34fe93ccf05f432eb8b38f824f09317bba3b1b06901cf6','2026-09-25 16:37:13','2026-09-18 16:47:30','2026-09-18 21:37:13'),(24,1,'01b6e204-452a-43bf-938b-30dd86665c86','e5dad930d5a5d92673f5d1c97d3a7a486a522c17e632d555761582892cbdbcf1','2026-09-25 16:47:41','2026-09-18 17:10:39','2026-09-18 21:47:41'),(25,1,'18dced67-30cb-4b76-880e-f6a54cde08b3','f3007b907690a229d60373708c5e6b1ce173cc844bde519ca8d38c02716690f7','2026-09-25 16:53:29','2026-09-18 17:10:39','2026-09-18 21:53:28'),(26,3,'a21d460c-11cb-4105-8998-109db704ce15','9dafe55382f05440e017d33b887fc9ec58e49b040bcfcac5b48070fa72cc2787','2026-09-25 17:41:31','2026-09-18 17:41:42','2026-09-18 22:41:31'),(27,3,'bdf5e3c2-588c-42f6-a43d-bb22849436ba','dc45d7ea9c1b1ba16293b5a349c704f1b06eff0e5e3b3db3c263559090684800','2026-09-25 17:45:40','2026-09-18 17:45:55','2026-09-18 22:45:40'),(28,3,'e1665dbb-a7be-4d84-bae9-ed9f325ed734','c99c1d7fece584706439eaa1be46ed898296c753cbe478628d5c0aff79646e4f','2026-09-25 17:51:22','2026-09-18 18:06:43','2026-09-18 22:51:22'),(29,3,'f79c490c-7b90-4f2e-9f6d-04ae2ccb93d1','f42ea75f532a5acca12461d50a1368725ca335e1a27d4f0c549111204ebe2a90','2026-09-25 18:06:53','2026-09-18 18:15:03','2026-09-18 23:06:52'),(30,1,'e6bc9d8b-4eba-42ac-9b59-78da1f9c3c0f','5a2be81a1611f43480eb28eea887d7ba06f08a28169af68b1aa042b26028a1e7','2026-09-25 18:07:32','2026-09-18 18:13:30','2026-09-18 23:07:32'),(31,3,'4f7c86ec-3e0b-4b34-80fd-a4147a16db73','6082d779bea673de4c5eb93b5804aa3a5e8abce644dbd504abda26f69590b661','2026-09-25 18:13:42','2026-09-18 18:15:03','2026-09-18 23:13:41'),(32,1,'884aa01b-48b9-4b1b-bc35-d3e6c93824db','f56539119f3f909a02be147d0236b21d29e7a920c5a7c6f9240bb320f80c7ce0','2026-09-25 18:14:33',NULL,'2026-09-18 23:14:32'),(33,3,'ed8a8a1e-b162-4158-83a1-757bc826384b','002a3afa6812a851700038a562c49da9822092195c8f89c8d47fe98faa6f2ca0','2026-09-25 18:15:32',NULL,'2026-09-18 23:15:32'),(34,3,'c2a1f444-47a3-4e8d-8823-58750beb4465','e31f54cfafe448cb16086a6769cfcec7ecc32f763191465412e4600e4d5fb5d6','2026-09-25 18:18:25',NULL,'2026-09-18 23:18:25'),(35,1,'bea35144-2868-4eda-a8a3-b69489875d3b','e0e0824197f1eada3069f4d80ec2ca2e6418b47d0e0b734d31f24477c89d1e05','2026-09-25 18:49:22',NULL,'2026-09-18 23:49:22');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reserva_detalle`
--

DROP TABLE IF EXISTS `reserva_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reserva_detalle` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_reserva` int unsigned NOT NULL,
  `id_habitacion` int unsigned DEFAULT NULL,
  `id_servicio` int unsigned DEFAULT NULL,
  `id_paquete` int unsigned DEFAULT NULL,
  `cantidad` int unsigned NOT NULL DEFAULT '1',
  `subtotal` decimal(12,2) NOT NULL,
  `configuracion_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rd_reserva` (`id_reserva`),
  KEY `idx_rd_habitacion` (`id_habitacion`),
  KEY `idx_rd_servicio` (`id_servicio`),
  KEY `idx_rd_paquete` (`id_paquete`),
  CONSTRAINT `fk_rd_habitacion` FOREIGN KEY (`id_habitacion`) REFERENCES `habitaciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rd_paquete` FOREIGN KEY (`id_paquete`) REFERENCES `paquetes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rd_reserva` FOREIGN KEY (`id_reserva`) REFERENCES `reservas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rd_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_rd_cantidad` CHECK ((`cantidad` > 0)),
  CONSTRAINT `chk_rd_subtotal` CHECK ((`subtotal` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=152 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reserva_detalle`
--

LOCK TABLES `reserva_detalle` WRITE;
/*!40000 ALTER TABLE `reserva_detalle` DISABLE KEYS */;
INSERT INTO `reserva_detalle` VALUES (148,113,25,NULL,NULL,1,0.00,NULL);
/*!40000 ALTER TABLE `reserva_detalle` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_reserva_detalle_bi` BEFORE INSERT ON `reserva_detalle` FOR EACH ROW BEGIN
    IF (NEW.id_habitacion IS NOT NULL AND NEW.id_servicio IS NOT NULL)
       OR (NEW.id_habitacion IS NOT NULL AND NEW.id_paquete IS NOT NULL)
       OR (NEW.id_servicio IS NOT NULL AND NEW.id_paquete IS NOT NULL)
       OR (NEW.id_habitacion IS NULL AND NEW.id_servicio IS NULL AND NEW.id_paquete IS NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El detalle de reserva debe contener exactamente un tipo de componente';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_reserva_detalle_bu` BEFORE UPDATE ON `reserva_detalle` FOR EACH ROW BEGIN
    IF (NEW.id_habitacion IS NOT NULL AND NEW.id_servicio IS NOT NULL)
       OR (NEW.id_habitacion IS NOT NULL AND NEW.id_paquete IS NOT NULL)
       OR (NEW.id_servicio IS NOT NULL AND NEW.id_paquete IS NOT NULL)
       OR (NEW.id_habitacion IS NULL AND NEW.id_servicio IS NULL AND NEW.id_paquete IS NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El detalle de reserva debe contener exactamente un tipo de componente';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `reservas`
--

DROP TABLE IF EXISTS `reservas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_cliente` int unsigned NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime NOT NULL,
  `numero_personas` int unsigned NOT NULL,
  `valor_total` decimal(12,2) NOT NULL,
  `anticipo` decimal(12,2) NOT NULL DEFAULT '0.00',
  `numero_confirmacion` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('pendiente','confirmada','cancelada','check-in','check-out') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reserva_confirmacion` (`numero_confirmacion`),
  KEY `idx_reservas_cliente` (`id_cliente`),
  KEY `idx_reservas_fechas` (`fecha_inicio`,`fecha_fin`),
  KEY `idx_reservas_estado` (`estado`),
  CONSTRAINT `fk_reserva_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_reserva_anticipo` CHECK (((`anticipo` >= 0) and (`anticipo` <= `valor_total`))),
  CONSTRAINT `chk_reserva_fechas` CHECK ((`fecha_fin` > `fecha_inicio`)),
  CONSTRAINT `chk_reserva_personas` CHECK ((`numero_personas` > 0)),
  CONSTRAINT `chk_reserva_valor` CHECK ((`valor_total` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservas`
--

LOCK TABLES `reservas` WRITE;
/*!40000 ALTER TABLE `reservas` DISABLE KEYS */;
INSERT INTO `reservas` VALUES (113,13,'2026-10-30 22:20:00','2026-11-05 22:20:00',2,480000.00,480000.00,'RES-1793244055650-DF66B2',NULL,'cancelada','2026-10-29 03:20:55','2026-10-29 04:12:13');
/*!40000 ALTER TABLE `reservas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rol_modulo_permiso`
--

DROP TABLE IF EXISTS `rol_modulo_permiso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol_modulo_permiso` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `id_rol` int unsigned NOT NULL,
  `id_modulo` int unsigned NOT NULL,
  `estado_permiso` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rol_modulo` (`id_rol`,`id_modulo`),
  KEY `fk_rmp_modulo` (`id_modulo`),
  CONSTRAINT `fk_rmp_modulo` FOREIGN KEY (`id_modulo`) REFERENCES `modulos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rmp_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol_modulo_permiso`
--

LOCK TABLES `rol_modulo_permiso` WRITE;
/*!40000 ALTER TABLE `rol_modulo_permiso` DISABLE KEYS */;
INSERT INTO `rol_modulo_permiso` VALUES (1,1,6,1,'2026-09-07 04:13:12'),(2,1,10,1,'2026-09-07 04:13:12'),(3,1,9,1,'2026-09-07 04:13:12'),(4,1,3,1,'2026-09-07 04:13:12'),(5,1,8,1,'2026-09-07 04:13:12'),(6,1,11,1,'2026-09-07 04:13:12'),(7,1,5,1,'2026-09-07 04:13:12'),(8,1,7,1,'2026-09-07 04:13:12'),(9,1,1,1,'2026-09-07 04:13:12'),(10,1,4,1,'2026-09-07 04:13:12'),(11,1,2,1,'2026-09-07 04:13:12'),(16,2,9,1,'2026-09-07 04:13:12'),(17,2,3,1,'2026-09-07 04:13:12'),(18,2,8,1,'2026-09-07 04:13:12'),(19,2,5,1,'2026-09-07 04:13:12'),(20,2,7,1,'2026-09-07 04:13:12'),(21,2,4,1,'2026-09-07 04:13:12');
/*!40000 ALTER TABLE `rol_modulo_permiso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permisos` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_rol` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_nombre` (`nombre_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrador','[\"ver\",\"exportar\",\"editar\",\"gestionar_roles\",\"gestionar_reservas\",\"gestionar_usuarios\",\"confirmar_pago\",\"eliminar\",\"crear\"]',1,'2026-09-07 04:13:12','2026-09-07 09:15:12'),(2,'Cliente','[\"ver\",\"crear\",\"editar\"]',1,'2026-09-07 04:13:12','2026-09-07 09:18:01');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicio_historial`
--

DROP TABLE IF EXISTS `servicio_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicio_historial` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_servicio` int unsigned NOT NULL,
  `id_usuario` int unsigned DEFAULT NULL,
  `accion` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `datos_anteriores` json DEFAULT NULL,
  `datos_nuevos` json DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_hist_usuario` (`id_usuario`),
  KEY `idx_hist_servicio_fecha` (`id_servicio`,`fecha`),
  CONSTRAINT `fk_hist_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hist_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicio_historial`
--

LOCK TABLES `servicio_historial` WRITE;
/*!40000 ALTER TABLE `servicio_historial` DISABLE KEYS */;
/*!40000 ALTER TABLE `servicio_historial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicio_imagenes`
--

DROP TABLE IF EXISTS `servicio_imagenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicio_imagenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_servicio` int unsigned NOT NULL,
  `archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_original` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_servicio_imagenes_servicio` (`id_servicio`),
  CONSTRAINT `fk_servicio_imagenes_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicio_imagenes`
--

LOCK TABLES `servicio_imagenes` WRITE;
/*!40000 ALTER TABLE `servicio_imagenes` DISABLE KEYS */;
INSERT INTO `servicio_imagenes` VALUES (8,8,'servicio-d2b81ee3-abe5-4bb1-a790-c1140123b661.jpg','sp.jpg',0,'2026-09-21 02:58:28'),(9,7,'servicio-f4a959e9-e9bc-4e56-bf1b-9385080e8551.jpg','c1.jpg',0,'2026-09-21 02:58:42'),(10,6,'servicio-e1273da9-1769-48f3-afec-203f1ba2f2f0.jpg','h1.jpg',0,'2026-09-21 02:58:51'),(24,47,'servicio-4bcd4b80-66d0-4318-a62a-ce96e7ad5669.webp','medico.webp',0,'2026-09-28 20:49:31'),(25,46,'servicio-96597504-5523-4ba5-8806-0909dea7c2b1.jpg','juegos.jpg',0,'2026-09-28 20:50:46'),(26,45,'servicio-1f51c865-9585-4768-b129-b4b429103caf.webp','fotos.webp',0,'2026-09-28 20:51:32'),(29,43,'servicio-24fb80e1-fb13-4813-8def-fc55583744f5.jpg','reserva.jpg',0,'2026-09-28 20:58:10'),(30,42,'servicio-db8c10ab-70ba-4c01-b15d-a3dc90369214.webp','rececion.webp',0,'2026-09-28 20:59:27'),(32,40,'servicio-0547c340-3da2-47b9-a00f-dda36b4d8b67.jpeg','decoracion.jpeg',0,'2026-09-28 21:01:07'),(33,39,'servicio-989c63fe-0fcc-4135-b148-da27cd2bd18b.webp','tour.webp',0,'2026-09-28 21:02:16'),(34,38,'servicio-e59a88e9-1837-4166-8bfd-0c38eadd3566.jpg','venta.jpg',0,'2026-09-28 21:03:07'),(35,37,'servicio-76a2f282-6b79-4d21-ac38-d922272100fd.jpg','mascota.jpg',0,'2026-09-28 21:03:47'),(36,36,'servicio-9949d4be-593d-4f87-8eb7-e487724e6ff8.webp','niÃ±era.webp',0,'2026-09-28 21:04:23'),(37,35,'servicio-d8372931-769e-4b86-b1c8-092851550bf8.webp','negocios.webp',0,'2026-09-28 21:05:54'),(38,34,'servicio-946e970b-41e0-44ce-8e80-053f70e8b493.jpg','late-check-out-hotel-reception.jpg',0,'2026-09-28 21:06:41'),(39,33,'servicio-3a9e7393-ed09-4d8b-8a32-66e8dbf7dc45.jpeg','check-in-process-reception.jpeg',0,'2026-09-28 21:07:25'),(40,32,'servicio-b668742c-0150-4c20-8c96-544bbd528595.webp','CopyofDSC02577-Enhanced-NR_2048x.webp',0,'2026-09-28 21:08:00'),(41,31,'servicio-3be0d835-1c9f-4eb6-b12c-d9dc86aad562.webp','OIP.webp',0,'2026-09-28 21:08:37'),(42,30,'servicio-f6659aec-456c-41eb-8180-663ee4e240d8.jpg','istockphoto-948986866-612x612.jpg',0,'2026-09-28 21:09:17'),(43,29,'servicio-503eefbc-6ec1-4fdf-8447-59f9c73e68e4.webp','lavandaria.webp',0,'2026-09-28 21:10:13'),(44,28,'servicio-1f66fb0b-b79a-43b4-bdc6-26b0cc317c91.png','DQ5zvn.png',0,'2026-09-28 21:11:04'),(45,27,'servicio-88ef380d-0d75-4384-9d54-411091fb4326.jpeg','aleman-1_5_123155.jpeg',0,'2026-09-28 21:12:27'),(46,26,'servicio-8546820e-c662-4071-ac18-5f6982152760.webp','manibar.webp',0,'2026-09-28 21:13:17'),(47,25,'servicio-79bc89b2-ae41-4df5-903f-69bb7be589f0.jpg','1_S-Ne_HvmQAl7qivBNAAvAA.jpg',0,'2026-09-28 21:14:02'),(48,24,'servicio-c6f5b37e-808f-4a66-9b90-a25846fd0722.webp','81_1166003955d073a4b1f4f4-800x378.webp',0,'2026-09-28 21:15:34'),(49,24,'servicio-799a4712-e264-405d-a116-4f2de9ab08a5.jpg','gym-turnstiles2.jpg',1,'2026-09-28 21:16:02'),(50,24,'servicio-8803745c-ee32-459e-b673-70d321efb95a.webp','OIP (1).webp',2,'2026-09-28 21:16:16'),(51,23,'servicio-065ef7bf-a898-404f-b6c2-74ae8cd33135.webp','a.webp',0,'2026-09-28 21:22:16'),(52,22,'servicio-59d77c84-d015-4f41-8c93-43e8fe6b1703.webp','picina.webp',0,'2026-09-28 21:24:56'),(53,41,'servicio-aace22a5-6994-48e2-8181-d29f0c305610.jpeg','IMG_1632.jpeg',0,'2026-09-28 21:36:58'),(54,47,'servicio-d49bac89-3883-4d21-9432-fd44de843bf2.png','X.png',1,'2026-10-05 04:04:17');
/*!40000 ALTER TABLE `servicio_imagenes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicios`
--

DROP TABLE IF EXISTS `servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_servicio` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo` decimal(12,2) NOT NULL,
  `disponibilidad` int unsigned NOT NULL DEFAULT '0',
  `cantidad_disponible` int NOT NULL DEFAULT '1',
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `historial_cambios` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_servicios_categoria` (`categoria`),
  KEY `idx_servicios_nombre` (`nombre_servicio`),
  KEY `idx_servicios_estado` (`estado`),
  CONSTRAINT `chk_servicio_costo` CHECK ((`costo` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicios`
--

LOCK TABLES `servicios` WRITE;
/*!40000 ALTER TABLE `servicios` DISABLE KEYS */;
INSERT INTO `servicios` VALUES (6,'Desayuno Buffet Internacional','Acceso completo al buffet de la mañana con variedad de frutas, panes, calientes, jugos naturales y estación de huevos','Alimentación',18000.00,1,1,'Horario de atención de 06:30 a 10:30 hrs en el restaurante principa',1,NULL,'2026-09-21 02:53:02','2026-09-21 02:53:02'),(7,'Traslado Aeropuerto','Transporte privado en vehículo climatizado desde el hotel hacia el aeropuerto internacional','Transporte',35000.00,1,1,'Requiere reserva previa en recepción con al menos 3 horas de anticipación',1,NULL,'2026-09-21 02:53:54','2026-09-22 09:11:32'),(8,'Masaje Sueco Relajante','Masaje corporal completo diseñado para aliviar la tensión muscular y promover el descanso profundo','Spa & Bienestar',65000.00,1,1,'Sujeto a disponibilidad de agenda en las cabinas del Spa',1,NULL,'2026-09-21 02:54:51','2026-10-05 03:19:34'),(22,'Piscina Climatizada','Acceso a piscina climatizada para huéspedes durante el horario establecido por el hotel','Recreación',30000.00,1,1,'Uso permitido de 7:00 a. m. a 9:00 p. m',1,NULL,'2026-09-28 20:22:06','2026-09-28 20:22:06'),(23,'Internet WiFi Premium','Conexión inalámbrica de alta velocidad para huéspedes en habitaciones y zonas comunes','Tecnología',10000.00,1,1,'Acceso válido durante 24 horas',1,NULL,'2026-09-28 20:23:15','2026-09-28 20:23:15'),(24,'Acceso al Gimnasio','Acceso a gimnasio equipado con máquinas cardiovasculares y equipos para entrenamiento','Recreación',20000.00,1,1,'servicio disponible para huéspedes mayores de 16 años',1,NULL,'2026-09-28 20:24:12','2026-09-28 20:24:12'),(25,'Almuerzo Ejecutivo','Menú del día compuesto por entrada, plato principal, bebida y postre','Restaurante',34999.00,1,1,'Disponible de 12:00 p. m. a 3:00 p. m',1,NULL,'2026-09-28 20:26:22','2026-09-28 20:26:22'),(26,'Minibar','Servicio de minibar con bebidas y productos empacados disponibles en la habitación','Alimentos y Bebidas',30000.00,1,1,'El valor corresponde al paquete básico de productos',1,NULL,'2026-09-28 20:27:22','2026-09-28 20:27:22'),(27,'Salón para Eventos','Espacio equipado para reuniones, conferencias, celebraciones y eventos empresariales','Eventos',549999.00,1,1,'Capacidad aproximada para 50 personas',1,NULL,'2026-09-28 20:27:51','2026-09-28 20:27:51'),(28,'Guarda Equipaje','Almacenamiento temporal y seguro del equipaje antes del check-in o después del check-out','Servicios al Huésped',9998.00,1,1,'servicio sujeto a disponibilidad del área de equipaje',1,NULL,'2026-09-28 20:29:14','2026-09-28 20:29:14'),(29,'Lavandería Express','Lavado y secado de prendas con servicio prioritario para huéspedes','Lavandería',20000.00,1,1,'Entrega estimada el mismo día según horario de recepción',1,NULL,'2026-09-28 20:29:53','2026-09-28 20:29:53'),(30,'Servicio de Botones','Ayuda con el traslado del equipaje desde la recepción hasta la habitación','Atención al Huésped',15000.00,1,1,'Disponible durante el horario de atención',1,NULL,'2026-09-28 20:30:27','2026-09-28 20:30:27'),(31,'Transporte Privado','Servicio de transporte privado desde el hotel hacia diferentes puntos de la ciudad','Transporte',50000.00,1,1,'Requiere reserva previa en recepción',1,NULL,'2026-09-28 20:31:07','2026-09-28 20:31:07'),(32,'Sauna','Acceso a sauna para relajación y descanso de los huéspedes','Bienestar',250000.00,1,1,'Uso máximo de 30 minutos por reserva',1,NULL,'2026-09-28 20:31:47','2026-09-28 20:31:47'),(33,'Check-in Anticipado','Permite al huésped ingresar a su habitación antes del horario habitual de entrada','Recepción',39999.00,1,1,'Sujeto a disponibilidad de habitaciones',1,NULL,'2026-09-28 20:32:48','2026-09-28 20:32:48'),(34,'Check-out Tardío','Permite permanecer en la habitación después del horario establecido para la salida','Recepción',50000.00,1,1,'Disponible según ocupación del hotel',1,NULL,'2026-09-28 20:33:16','2026-09-28 20:33:16'),(35,'Centro de Negocios','Espacio equipado con computador, impresora e internet para actividades laborales','Negocios',50000.00,1,1,'Uso por períodos de una hora',1,NULL,'2026-09-28 20:33:53','2026-09-28 20:33:53'),(36,'Servicio de Niñera','Atención y acompañamiento temporal de niños durante la estadía del huésped','Atención al Huésped',45000.00,1,1,'Solicitar con anticipación y sujeto a disponibilidad',1,NULL,'2026-09-28 20:34:48','2026-09-28 20:34:48'),(37,'Alojamiento para Mascotas','Espacio acondicionado para recibir mascotas de huéspedes durante su estadía','Mascotas',35000.00,1,1,'Aplican condiciones según tamaño y tipo de mascota',1,NULL,'2026-09-28 20:35:19','2026-09-28 20:35:19'),(38,'Venta de Entradas Turísticas','Gestión y venta de entradas para atracciones y actividades turísticas de la ciudad','Turismo',10000.00,1,1,'El valor corresponde al servicio de gestión; entradas se cobran aparte',1,NULL,'2026-09-28 20:35:57','2026-09-28 20:35:57'),(39,'Tour por la Ciudad','Recorrido guiado por los principales lugares turísticos y culturales de la ciudad','Turismo',89997.00,1,1,'Duración aproximada de cuatro horas',1,NULL,'2026-09-28 20:36:30','2026-09-28 20:36:30'),(40,'Decoración de Habitación','Decoración especial de la habitación para cumpleaños, aniversarios u ocasiones especiales','Eventos',80000.00,1,1,'Reservar mínimo 24 horas antes',1,NULL,'2026-09-28 20:36:56','2026-09-28 20:36:56'),(41,'Recepción de Paquetes','Recepción y custodia temporal de paquetes enviados a huéspedes registrados','Servicios al Huésped',10000.00,1,1,'Se requiere identificación para retirar el paquete',1,NULL,'2026-09-28 20:37:30','2026-09-28 20:37:30'),(42,'Servicio de Conserjería','Atención personalizada para orientar al huésped sobre servicios, lugares y actividades','Atención al Huésped',0.00,1,1,'Atención durante el horario de recepción',1,NULL,'2026-09-28 20:38:44','2026-09-28 20:38:44'),(43,'Reserva de Restaurante','Gestión de reservas en restaurantes de la ciudad para huéspedes del hotel','Conserjería',10000.00,1,1,'Sujeto a disponibilidad del restaurante',1,NULL,'2026-09-28 20:39:15','2026-09-28 20:39:15'),(45,'Servicio de Fotografía','Sesión fotográfica básica para huéspedes dentro de las instalaciones del hotel','Eventos',120000.00,1,1,'reserva previa requerida',1,NULL,'2026-09-28 20:40:55','2026-09-28 20:40:55'),(46,'Zona de Juegos','Acceso a un espacio recreativo con juegos de mesa y entretenimiento','Recreación',15000.00,1,1,'Uso durante dos horas',1,NULL,'2026-09-28 20:41:30','2026-10-16 23:19:34'),(47,'Asistencia Médica Básica','Coordinación de atención médica externa en caso de que un huésped la solicite','Atención al Huésped',30000.00,1,4,'El servicio corresponde a la coordinación; los costos médicos externos son adicionales',1,NULL,'2026-09-28 20:42:11','2026-10-02 21:06:35');
/*!40000 ALTER TABLE `servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sesiones_activas`
--

DROP TABLE IF EXISTS `sesiones_activas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones_activas` (
  `id_usuario` bigint NOT NULL,
  `session_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `close_pending_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`,`session_id`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `idx_sesiones_expiracion` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sesiones_activas`
--

LOCK TABLES `sesiones_activas` WRITE;
/*!40000 ALTER TABLE `sesiones_activas` DISABLE KEYS */;
INSERT INTO `sesiones_activas` VALUES (1,'c5348868-c05d-4872-a056-175d47eb4520','2026-10-28 23:46:34','2026-10-28 21:19:55',NULL);
/*!40000 ALTER TABLE `sesiones_activas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_rol` int unsigned NOT NULL,
  `estado` enum('activo','inactivo','bloqueado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reset_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  KEY `fk_usuarios_rol` (`id_rol`),
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Darwin','numerosdeluno@gmail.com','$2a$10$z7xe4g1pYxv63no8MWyEB.kMIwE9FFt2/dUZoNrO65T9EUgnYWG3G',1,'activo','2026-09-08 02:04:49','2026-09-25 05:12:07',NULL,NULL),(3,'Optimus prime','xcosas135@gmail.com','$2a$10$4tAPdxHo3IpHhvxpeB8PyO1BOBBpeoFcZq2yd0.HmcTMYp3.3yRQK',2,'activo','2026-09-11 01:23:40','2026-09-30 05:16:26',NULL,NULL),(58,'Yanny Valencia','yayavalencia30@gmail.com','$2a$10$yFW08S9j0nakrIaNldLDruaqxIXsHEuo4p4PVFN9oMjeK.Qb.cNCW',2,'activo','2026-09-22 02:48:45','2026-09-22 02:48:45',NULL,NULL),(61,'yanny.valencia','valenciayanny24@gmail.com','$2a$12$8CAIzUPorAUxtvdSeNpnr.c6USmY7z3rfxBy8jvWzZU3ZnPGCIKWq',2,'activo','2026-09-22 03:22:09','2026-09-22 03:22:09',NULL,NULL),(64,'edwin.hernandez','eh7521140@gmail.com','$2a$12$1dklMIADSBY9WVDhQJ7Q1e1cIyC4pmWNOjHcuw0rIUJWHV/L5yq0e',2,'activo','2026-09-22 20:13:27','2026-09-29 17:32:44',NULL,NULL),(65,'Aleja','a02331264@gmail.com','$2a$10$xztRbTcljgAwStWx8bcdUOgdPWF2cfjNvr5AN9XOyGaVfl5qdVT86',1,'activo','2026-09-22 20:24:06','2026-09-28 20:50:43',NULL,NULL),(66,'Chocolate con pan','arepaconquesito18@gmail.com','$2a$10$WxptonM8csCg.fhWs4HKb.PYYKq8FVdnG8KYIIKWj/bFEKXQ17yY2',2,'activo','2026-09-22 20:25:49','2026-10-02 21:02:52',NULL,NULL),(68,'aida.castro.tamara','aidatamara58@gmail.com','$2a$12$84tkjssw8Cnin3SS9zfIC.mMiClyIYnD6e6.bJ2FpXzWhCOjBJPEy',1,'activo','2026-09-28 20:12:34','2026-09-28 20:15:04',NULL,NULL),(69,'thiago.google','thiagogarciaorozco5@gmail.com','$2a$12$GUMJjzbEhfrPe2dr2u9VxuXbSml8tjoNrcFmgSa4LT7tlAgNsZlgi',2,'activo','2026-09-28 20:14:04','2026-10-08 19:38:48',NULL,NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_dashboard_ventas_mensuales`
--

DROP TABLE IF EXISTS `vw_dashboard_ventas_mensuales`;
/*!50001 DROP VIEW IF EXISTS `vw_dashboard_ventas_mensuales`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_dashboard_ventas_mensuales` AS SELECT 
 1 AS `anio`,
 1 AS `mes`,
 1 AS `reservas`,
 1 AS `ventas`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_habitaciones_catalogo`
--

DROP TABLE IF EXISTS `vw_habitaciones_catalogo`;
/*!50001 DROP VIEW IF EXISTS `vw_habitaciones_catalogo`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_habitaciones_catalogo` AS SELECT 
 1 AS `id`,
 1 AS `numero_habitacion`,
 1 AS `tipo_habitacion`,
 1 AS `capacidad_maxima`,
 1 AS `descripcion`,
 1 AS `comodidades`,
 1 AS `tarifa`,
 1 AS `estado`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_resumen_reservas`
--

DROP TABLE IF EXISTS `vw_resumen_reservas`;
/*!50001 DROP VIEW IF EXISTS `vw_resumen_reservas`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_resumen_reservas` AS SELECT 
 1 AS `id`,
 1 AS `numero_confirmacion`,
 1 AS `id_cliente`,
 1 AS `cliente`,
 1 AS `correo`,
 1 AS `fecha_inicio`,
 1 AS `fecha_fin`,
 1 AS `numero_personas`,
 1 AS `valor_total`,
 1 AS `anticipo`,
 1 AS `anticipo_requerido`,
 1 AS `anticipo_completo`,
 1 AS `estado`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'sistema_hospedaje'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_habitacion_disponible` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_habitacion_disponible`(
    IN p_id_habitacion INT UNSIGNED,
    IN p_fecha_inicio DATETIME,
    IN p_fecha_fin DATETIME
)
BEGIN
    SELECT
        h.id,
        h.numero_habitacion,
        h.tipo_habitacion,
        h.capacidad_maxima,
        h.tarifa,
        h.estado,
        CASE
            WHEN h.estado = 'inhabilitada' THEN FALSE
            WHEN EXISTS (
                SELECT 1
                FROM reserva_detalle rd
                INNER JOIN reservas r ON r.id = rd.id_reserva
                WHERE rd.id_habitacion = h.id
                  AND r.estado <> 'cancelada'
                  AND r.fecha_inicio < p_fecha_fin
                  AND r.fecha_fin > p_fecha_inicio
            ) THEN FALSE
            ELSE TRUE
        END AS disponible
    FROM habitaciones h
    WHERE h.id = p_id_habitacion;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `vw_dashboard_ventas_mensuales`
--

/*!50001 DROP VIEW IF EXISTS `vw_dashboard_ventas_mensuales`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_dashboard_ventas_mensuales` AS select year(`r`.`created_at`) AS `anio`,month(`r`.`created_at`) AS `mes`,count(0) AS `reservas`,coalesce(sum(`r`.`valor_total`),0) AS `ventas` from `reservas` `r` where (`r`.`estado` <> 'cancelada') group by year(`r`.`created_at`),month(`r`.`created_at`) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_habitaciones_catalogo`
--

/*!50001 DROP VIEW IF EXISTS `vw_habitaciones_catalogo`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_habitaciones_catalogo` AS select `h`.`id` AS `id`,`h`.`numero_habitacion` AS `numero_habitacion`,`h`.`tipo_habitacion` AS `tipo_habitacion`,`h`.`capacidad_maxima` AS `capacidad_maxima`,`h`.`descripcion` AS `descripcion`,`h`.`comodidades` AS `comodidades`,`h`.`tarifa` AS `tarifa`,`h`.`estado` AS `estado` from `habitaciones` `h` where (`h`.`estado` <> 'inhabilitada') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_resumen_reservas`
--

/*!50001 DROP VIEW IF EXISTS `vw_resumen_reservas`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_resumen_reservas` AS select `r`.`id` AS `id`,`r`.`numero_confirmacion` AS `numero_confirmacion`,`r`.`id_cliente` AS `id_cliente`,concat(`c`.`nombre`,' ',`c`.`apellido`) AS `cliente`,`c`.`correo` AS `correo`,`r`.`fecha_inicio` AS `fecha_inicio`,`r`.`fecha_fin` AS `fecha_fin`,`r`.`numero_personas` AS `numero_personas`,`r`.`valor_total` AS `valor_total`,`r`.`anticipo` AS `anticipo`,round((`r`.`valor_total` * 0.50),2) AS `anticipo_requerido`,(case when (`r`.`anticipo` >= round((`r`.`valor_total` * 0.50),2)) then true else false end) AS `anticipo_completo`,`r`.`estado` AS `estado`,`r`.`created_at` AS `created_at` from (`reservas` `r` join `clientes` `c` on((`c`.`id` = `r`.`id_cliente`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-28 23:20:55
