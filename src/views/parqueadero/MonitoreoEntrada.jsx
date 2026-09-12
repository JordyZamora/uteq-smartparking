import React, { useState, useRef, useEffect } from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CFormInput,
  CSpinner,
  CAlert,
  CTable,
  CTableBody,
  CTableRow,
  CTableDataCell,
  CTableHeaderCell,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCamera,
  cilCameraControl,
  cilSearch,
  cilWarning,
  cilCheckCircle,
  cilXCircle,
  cilReload,
} from '@coreui/icons'

const MonitoreoEntrada = () => {
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [imagenPrevia, setImagenPrevia] = useState(null)
  const [archivoParaEnviar, setArchivoParaEnviar] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [resultadoAPI, setResultadoAPI] = useState(null)
  const [errorAPI, setErrorAPI] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      streamRef.current = stream
      setCamaraActiva(true)
      setImagenPrevia(null)
      setArchivoParaEnviar(null)
      setResultadoAPI(null)
      setErrorAPI(null)
    } catch (error) {
      console.error('Error al acceder a la cámara:', error)
      setErrorAPI('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
    }
  }

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCamaraActiva(false)
  }

  const capturarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `CAPTURA_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setArchivoParaEnviar(file)
        setImagenPrevia(URL.createObjectURL(file))
        detenerCamara()
      }
    }, 'image/jpeg', 0.95)
  }

  const manejarSeleccionArchivo = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setErrorAPI('Formato no admitido. Seleccione una imagen JPG o PNG.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorAPI('La imagen no debe superar el límite de 4 MiB.')
      return
    }

    setArchivoParaEnviar(file)
    setImagenPrevia(URL.createObjectURL(file))
    setResultadoAPI(null)
    setErrorAPI(null)
    detenerCamara()
  }

  useEffect(() => {
    return () => detenerCamara()
  }, [])

  const detectarPlaca = async () => {
    if (!archivoParaEnviar) return

    setProcesando(true)
    setErrorAPI(null)
    setResultadoAPI(null)

    try {
      const endpoint = import.meta.env.VITE_OCR_ENDPOINT
      if (!endpoint) throw new Error('Falta configurar la variable de entorno VITE_OCR_ENDPOINT.')

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': archivoParaEnviar.type || 'application/octet-stream',
        },
        body: archivoParaEnviar,
      })

      if (!response.ok) {
        if (response.status === 400) throw new Error('400: Imagen vacía, inválida o dimensiones no permitidas.')
        if (response.status === 413) throw new Error('413: La imagen es superior a 4 MiB.')
        if (response.status === 415) throw new Error('415: Formato de imagen no admitido.')
        if (response.status === 502) throw new Error('502: Fallo del servicio OCR o consulta en Supabase.')
        if (response.status === 504) throw new Error('504: Tiempo de respuesta agotado.')
        throw new Error(`Error HTTP ${response.status}`)
      }

      const data = await response.json()
      setResultadoAPI(data)
    } catch (error) {
      setErrorAPI(error.message)
    } finally {
      setProcesando(false)
    }
  }

  const resetearTodo = () => {
    setImagenPrevia(null)
    setArchivoParaEnviar(null)
    setResultadoAPI(null)
    setErrorAPI(null)
    detenerCamara()
  }

  const renderResultados = () => {
    if (errorAPI) {
      return (
        <CAlert color="danger" className="d-flex align-items-center mb-0">
          <CIcon icon={cilWarning} size="xl" className="me-2" />
          <div>{errorAPI}</div>
        </CAlert>
      )
    }

    if (!resultadoAPI) {
      return (
        <div className="text-center text-muted py-5">
          <CIcon icon={cilSearch} size="3xl" className="mb-3 text-secondary" />
          <p>Captura una foto o selecciona una imagen para realizar el escaneo automático.</p>
        </div>
      )
    }

    let imagenMarcadaSrc = null
    if (resultadoAPI.imagen_marcada?.base64) {
      imagenMarcadaSrc = `data:${resultadoAPI.imagen_marcada.mime_type || 'image/jpeg'};base64,${resultadoAPI.imagen_marcada.base64}`
    }

    const { estado, vehiculo, placa, confianza } = resultadoAPI

    return (
      <div>
        {imagenMarcadaSrc && (
          <div className="mb-3 text-center bg-dark p-2 rounded border border-secondary">
            <span className="small text-muted d-block mb-2 text-start">Placa Detectada (OCR)</span>
            <img
              src={imagenMarcadaSrc}
              alt="Placa procesada"
              className="img-fluid rounded"
              style={{ maxHeight: '200px', objectFit: 'contain' }}
            />
          </div>
        )}

        {estado === 'no_registrado' && (
          <>
            <CAlert color="danger" className="text-center fw-bold mb-3">
              <CIcon icon={cilXCircle} size="xl" className="me-2" />
              VEHÍCULO NO REGISTRADO
            </CAlert>

            <CTable bordered responsive hover size="sm" className="mb-3">
              <CTableBody>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold" style={{ width: '40%' }}>
                    Placa detectada
                  </CTableHeaderCell>
                  <CTableDataCell className="fw-bold">{placa || 'N/A'}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Confianza OCR</CTableHeaderCell>
                  <CTableDataCell>
                    {confianza ? `${(confianza * 100).toFixed(1).replace('.', ',')} %` : 'N/A'}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Estado</CTableHeaderCell>
                  <CTableDataCell>
                    <CBadge color="danger">No Registrado</CBadge>
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>

            <CAlert color="warning" className="small">
              Ingreso no autorizado. La placa leída por la cámara no existe en Supabase.
            </CAlert>
          </>
        )}

        {estado === 'encontrado' && vehiculo && (
          <>
            <CAlert color="success" className="text-center fw-bold mb-3">
              <CIcon icon={cilCheckCircle} size="xl" className="me-2" />
              INGRESO AUTORIZADO
            </CAlert>

            {(vehiculo.fotografia || (vehiculo.propietario && vehiculo.propietario.fotografia)) && (
              <div className="d-flex justify-content-center gap-4 mb-3 p-2 bg-dark rounded border border-secondary">
                {vehiculo.fotografia && (
                  <div className="text-center">
                    <span className="small text-muted fw-bold d-block mb-1">Vehículo</span>
                    <img
                      src={vehiculo.fotografia}
                      alt="Vehículo"
                      className="border rounded"
                      style={{ height: '110px', width: '110px', objectFit: 'cover' }}
                    />
                  </div>
                )}
                {vehiculo.propietario && vehiculo.propietario.fotografia && (
                  <div className="text-center">
                    <span className="small text-muted fw-bold d-block mb-1">Propietario</span>
                    <img
                      src={vehiculo.propietario.fotografia}
                      alt="Propietario"
                      className="border rounded"
                      style={{ height: '110px', width: '110px', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>
            )}

            <CTable bordered responsive hover size="sm" className="mb-3">
              <CTableBody>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold" style={{ width: '40%' }}>
                    Placa
                  </CTableHeaderCell>
                  <CTableDataCell className="fw-bold">{placa}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Confianza OCR</CTableHeaderCell>
                  <CTableDataCell>
                    {confianza ? `${(confianza * 100).toFixed(1).replace('.', ',')} %` : 'N/A'}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Marca</CTableHeaderCell>
                  <CTableDataCell>{vehiculo.marca || 'N/A'}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Modelo</CTableHeaderCell>
                  <CTableDataCell>{vehiculo.modelo || 'N/A'}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Año</CTableHeaderCell>
                  <CTableDataCell>{vehiculo.anio || vehiculo.año || 'N/A'}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Color</CTableHeaderCell>
                  <CTableDataCell>{vehiculo.color || 'N/A'}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Tipo</CTableHeaderCell>
                  <CTableDataCell>{vehiculo.tipo || vehiculo.tipo_vehiculo || 'N/A'}</CTableDataCell>
                </CTableRow>
                {vehiculo.propietario && (
                  <>
                    <CTableRow>
                      <CTableHeaderCell className="text-secondary fw-bold">Propietario</CTableHeaderCell>
                      <CTableDataCell className="fw-bold">{vehiculo.propietario.nombre}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell className="text-secondary fw-bold">Cédula</CTableHeaderCell>
                      <CTableDataCell>{vehiculo.propietario.cedula_enmascarada || 'N/A'}</CTableDataCell>
                    </CTableRow>
                  </>
                )}
                <CTableRow>
                  <CTableHeaderCell className="text-secondary fw-bold">Autorización</CTableHeaderCell>
                  <CTableDataCell>
                    <CBadge color="success">Autorizado</CBadge>
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </>
        )}

        {['sin_placa', 'baja_confianza', 'multiples_placas'].includes(estado) && (
          <CAlert color="warning" className="d-flex align-items-center mb-3">
            <CIcon icon={cilWarning} size="xl" className="me-3" />
            <div>
              <strong>Atención: {estado.replace('_', ' ').toUpperCase()}</strong>
              <br />
              Intente capturar la imagen nuevamente asegurándose de enfocar la placa con nitidez.
            </div>
          </CAlert>
        )}

        <CButton color="secondary" className="w-100 mt-2" onClick={resetearTodo}>
          <CIcon icon={cilReload} className="me-1" /> Procesar otra imagen
        </CButton>
      </div>
    )
  }

  return (
    <CRow>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <CCol md={12} className="mb-3">
        <h3>Monitoreo de entrada</h3>
        <p className="text-muted">Detección de placa vía API REST OCR y validación en Supabase.</p>
      </CCol>

      <CCol md={6}>
        <CCard className="mb-4 shadow-sm h-100">
          <CCardHeader className="bg-dark text-white d-flex justify-content-between align-items-center">
            <strong>Captura del vehículo</strong>
            {camaraActiva && <CBadge color="danger">EN VIVO</CBadge>}
          </CCardHeader>
          <CCardBody className="d-flex flex-column">
            <div
              className="bg-dark rounded mb-3 d-flex align-items-center justify-content-center overflow-hidden position-relative"
              style={{ height: '280px' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: camaraActiva ? 'block' : 'none',
                }}
              />
              {!camaraActiva && imagenPrevia && (
                <img
                  src={imagenPrevia}
                  alt="Vista previa"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
              {!camaraActiva && !imagenPrevia && (
                <div className="text-center text-white-50">
                  <CIcon icon={cilCamera} size="3xl" className="mb-2" />
                  <p className="m-0">Sin cámara o imagen seleccionada</p>
                </div>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              {!camaraActiva ? (
                <CButton color="primary" onClick={iniciarCamara} disabled={procesando}>
                  <CIcon icon={cilCamera} className="me-1" /> Activar Cámara
                </CButton>
              ) : (
                <>
                  <CButton color="danger" onClick={detenerCamara} className="text-white">
                    Detener Cámara
                  </CButton>
                  <CButton color="success" className="text-white fw-bold" onClick={capturarFoto}>
                    <CIcon icon={cilCameraControl} className="me-1" /> Capturar Foto
                  </CButton>
                </>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="fileUpload" className="form-label text-muted small fw-semibold">
                O selecciona una imagen del dispositivo:
              </label>
              <CFormInput
                type="file"
                id="fileUpload"
                accept="image/jpeg, image/png"
                onChange={manejarSeleccionArchivo}
                disabled={procesando || camaraActiva}
              />
            </div>

            <CButton
              color="success"
              className="w-100 text-white fw-bold mt-auto"
              size="lg"
              onClick={detectarPlaca}
              disabled={!archivoParaEnviar || procesando || camaraActiva}
            >
              {procesando ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Procesando en Supabase...
                </>
              ) : (
                <>
                  <CIcon icon={cilSearch} className="me-1" /> Detectar Placa
                </>
              )}
            </CButton>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={6}>
        <CCard className="mb-4 shadow-sm h-100">
          <CCardHeader className="bg-dark text-white">
            <strong>Resultado del reconocimiento</strong>
          </CCardHeader>
          <CCardBody>
            {procesando ? (
              <div className="text-center py-5">
                <CSpinner color="success" style={{ width: '3rem', height: '3rem' }} />
                <p className="mt-3 text-muted fw-semibold">Analizando imagen y consultando servicio OCR...</p>
              </div>
            ) : (
              renderResultados()
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default MonitoreoEntrada