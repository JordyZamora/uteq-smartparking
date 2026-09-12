import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilPlus, cilTrash } from '@coreui/icons'

import { useVehiculos } from '../../hooks/useVehiculos'
import { supabase } from '../../lib/supabase'

const ListaVehiculos = () => {
  const { vehiculos, cargando, error, recargar } = useVehiculos()
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const vehiculosPorPagina = 10

  // Estados del Modal (Crear / Editar)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    placa: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    color: '',
    propietario_nombre: '',
    cedula_enmascarada: '',
    correo_institucional: '',
    autorizado: true,
    foto_url: '',
    foto_propietario_url: '',
  })

  useEffect(() => {
    setPagina(1)
  }, [busqueda])

  const vehiculosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return vehiculos

    return vehiculos.filter((vehiculo) =>
      [
        vehiculo.placa,
        vehiculo.marca,
        vehiculo.modelo,
        vehiculo.color,
        vehiculo.propietario_nombre,
        vehiculo.correo_institucional,
      ].some((valor) => valor?.toLowerCase().includes(texto)),
    )
  }, [vehiculos, busqueda])

  const totalPaginas = Math.max(
    1,
    Math.ceil(vehiculosFiltrados.length / vehiculosPorPagina),
  )
  const paginaActual = Math.min(pagina, totalPaginas)

  const vehiculosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * vehiculosPorPagina
    return vehiculosFiltrados.slice(inicio, inicio + vehiculosPorPagina)
  }, [vehiculosFiltrados, paginaActual])

  // Abrir Modal Crear
  const handleOpenAddModal = () => {
    setEditingId(null)
    setFormData({
      placa: '',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      color: '',
      propietario_nombre: '',
      cedula_enmascarada: '',
      correo_institucional: '',
      autorizado: true,
      foto_url: '',
      foto_propietario_url: '',
    })
    setModalVisible(true)
  }

  // Abrir Modal Editar
  const handleOpenEditModal = (vehiculo) => {
    setEditingId(vehiculo.id)
    setFormData({
      placa: vehiculo.placa || '',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      anio: vehiculo.anio || '',
      color: vehiculo.color || '',
      propietario_nombre: vehiculo.propietario_nombre || '',
      cedula_enmascarada: vehiculo.cedula_enmascarada || '',
      correo_institucional: vehiculo.correo_institucional || '',
      autorizado: vehiculo.autorizado !== false,
      foto_url: vehiculo.foto_url || '',
      foto_propietario_url: vehiculo.foto_propietario_url || '',
    })
    setModalVisible(true)
  }

  // Guardar (Insert o Update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const payload = {
        ...formData,
        foto_fuente_url: formData.foto_url,
      }

      if (editingId) {
        const { error } = await supabase
          .from('vehiculos')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vehiculos')
          .insert([payload])
        if (error) throw error
      }

      setModalVisible(false)
      recargar()
    } catch (err) {
      alert('Error al guardar el vehículo: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar vehículo
  const handleDelete = async (id, placa) => {
    if (window.confirm(`¿Seguro que deseas eliminar el vehículo con placa ${placa}?`)) {
      try {
        const { error } = await supabase.from('vehiculos').delete().eq('id', id)
        if (error) throw error
        recargar()
      } catch (err) {
        alert('Error al eliminar el vehículo: ' + err.message)
      }
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <strong>Vehículos y propietarios</strong>
          <div className="small text-body-secondary">
            Vehículos autorizados en UTEQ Smart Parking
          </div>
        </div>

        <div className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={recargar} disabled={cargando}>
            Actualizar
          </CButton>
          <CButton color="success" className="text-white" onClick={handleOpenAddModal}>
            <CIcon icon={cilPlus} className="me-1" /> Nuevo Vehículo
          </CButton>
        </div>
      </CCardHeader>

      <CCardBody>
        <div className="d-flex justify-content-between align-items-center mb-3 gap-3">
          <CFormInput
            type="search"
            placeholder="Buscar placa, vehículo o propietario..."
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            style={{ maxWidth: '420px' }}
          />

          <span className="text-body-secondary">
            {vehiculosFiltrados.length} vehículos
          </span>
        </div>

        {cargando && (
          <div className="text-center py-5">
            <CSpinner color="success" />
            <p className="mt-3">Cargando vehículos...</p>
          </div>
        )}

        {!cargando && error && (
          <CAlert color="danger">
            No se pudieron cargar los vehículos: {error}
          </CAlert>
        )}

        {!cargando && !error && (
          <>
            <CTable align="middle" bordered hover responsive striped>
              <CTableHead color="dark">
                <CTableRow>
                  <CTableHeaderCell>Foto del vehículo</CTableHeaderCell>
                  <CTableHeaderCell>Placa</CTableHeaderCell>
                  <CTableHeaderCell>Vehículo</CTableHeaderCell>
                  <CTableHeaderCell>Año / color</CTableHeaderCell>
                  <CTableHeaderCell>Foto del propietario</CTableHeaderCell>
                  <CTableHeaderCell>Propietario</CTableHeaderCell>
                  <CTableHeaderCell>Cédula</CTableHeaderCell>
                  <CTableHeaderCell>Correo</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {vehiculosPaginados.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={10} className="text-center py-4">
                      No se encontraron vehículos.
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  vehiculosPaginados.map((vehiculo) => (
                    <CTableRow key={vehiculo.id}>
                      <CTableDataCell>
                        <a
                          href={vehiculo.foto_fuente_url || vehiculo.foto_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir fuente de la imagen"
                        >
                          <img
                            src={vehiculo.foto_url}
                            alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                            width="100"
                            height="65"
                            style={{ objectFit: 'cover', borderRadius: '8px' }}
                          />
                        </a>
                      </CTableDataCell>

                      <CTableDataCell>
                        <CBadge color="dark" className="fs-6">
                          {vehiculo.placa}
                        </CBadge>
                      </CTableDataCell>

                      <CTableDataCell>
                        <strong>{vehiculo.marca}</strong>
                        <div className="small text-body-secondary">
                          {vehiculo.modelo}
                        </div>
                      </CTableDataCell>

                      <CTableDataCell>
                        {vehiculo.anio}
                        <div className="small text-body-secondary">
                          {vehiculo.color}
                        </div>
                      </CTableDataCell>

                      <CTableDataCell className="text-center">
                        <img
                          src={vehiculo.foto_propietario_url}
                          alt={`Fotografía de ${vehiculo.propietario_nombre}`}
                          width="60"
                          height="60"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          style={{
                            objectFit: 'cover',
                            borderRadius: '50%',
                            border: '2px solid var(--cui-border-color)',
                          }}
                        />
                      </CTableDataCell>

                      <CTableDataCell>
                        {vehiculo.propietario_nombre}
                      </CTableDataCell>

                      <CTableDataCell>
                        {vehiculo.cedula_enmascarada}
                      </CTableDataCell>

                      <CTableDataCell>
                        <a href={`mailto:${vehiculo.correo_institucional}`}>
                          {vehiculo.correo_institucional}
                        </a>
                      </CTableDataCell>

                      <CTableDataCell>
                        <CBadge color={vehiculo.autorizado ? 'success' : 'danger'}>
                          {vehiculo.autorizado ? 'Autorizado' : 'No autorizado'}
                        </CBadge>
                      </CTableDataCell>

                      <CTableDataCell className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <CButton
                            color="info"
                            size="sm"
                            className="text-white"
                            onClick={() => handleOpenEditModal(vehiculo)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            className="text-white"
                            onClick={() => handleDelete(vehiculo.id, vehiculo.placa)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>

            <div className="d-flex justify-content-between align-items-center">
              <small className="text-body-secondary">
                Página {paginaActual} de {totalPaginas}
              </small>

              <div className="d-flex gap-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  disabled={paginaActual === 1}
                  onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
                >
                  Anterior
                </CButton>

                <CButton
                  color="success"
                  variant="outline"
                  disabled={paginaActual === totalPaginas}
                  onClick={() =>
                    setPagina((valor) => Math.min(totalPaginas, valor + 1))
                  }
                >
                  Siguiente
                </CButton>
              </div>
            </div>
          </>
        )}
      </CCardBody>

      {/* MODAL CREAR / EDITAR */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} size="lg">
        <CModalHeader onClose={() => setModalVisible(false)}>
          <CModalTitle>{editingId ? 'Editar Vehículo' : 'Añadir Nuevo Vehículo'}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <CRow className="g-3">
              <CCol md={4}>
                <label className="form-label">Placa</label>
                <CFormInput
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                  required
                />
              </CCol>
              <CCol md={4}>
                <label className="form-label">Marca</label>
                <CFormInput
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  required
                />
              </CCol>
              <CCol md={4}>
                <label className="form-label">Modelo</label>
                <CFormInput
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  required
                />
              </CCol>
              <CCol md={4}>
                <label className="form-label">Año</label>
                <CFormInput
                  type="number"
                  value={formData.anio}
                  onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                />
              </CCol>
              <CCol md={4}>
                <label className="form-label">Color</label>
                <CFormInput
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </CCol>
              <CCol md={4}>
                <label className="form-label">Estado</label>
                <CFormSelect
                  value={formData.autorizado ? 'true' : 'false'}
                  onChange={(e) =>
                    setFormData({ ...formData, autorizado: e.target.value === 'true' })
                  }
                >
                  <option value="true">Autorizado</option>
                  <option value="false">No autorizado</option>
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <label className="form-label">Propietario</label>
                <CFormInput
                  value={formData.propietario_nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, propietario_nombre: e.target.value })
                  }
                  required
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label">Cédula</label>
                <CFormInput
                  value={formData.cedula_enmascarada}
                  onChange={(e) =>
                    setFormData({ ...formData, cedula_enmascarada: e.target.value })
                  }
                />
              </CCol>
              <CCol md={12}>
                <label className="form-label">Correo Institucional</label>
                <CFormInput
                  type="email"
                  value={formData.correo_institucional}
                  onChange={(e) =>
                    setFormData({ ...formData, correo_institucional: e.target.value })
                  }
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label">URL Foto del Vehículo</label>
                <CFormInput
                  value={formData.foto_url}
                  onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  placeholder="https://..."
                />
              </CCol>
              <CCol md={6}>
                <label className="form-label">URL Foto del Propietario</label>
                <CFormInput
                  value={formData.foto_propietario_url}
                  onChange={(e) =>
                    setFormData({ ...formData, foto_propietario_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setModalVisible(false)}>
              Cancelar
            </CButton>
            <CButton color="success" type="submit" disabled={guardando} className="text-white">
              {guardando ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Registrar Vehículo'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CCard>
  )
}

export default ListaVehiculos