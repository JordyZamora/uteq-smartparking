import React, { useState, useEffect, useMemo } from 'react'
import {
    CCard,
    CCardHeader,
    CCardBody,
    CRow,
    CCol,
    CButton,
    CButtonGroup,
    CBadge,
    CFormInput,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CForm,
    CFormSelect,
    CSpinner,
    CTable,
    CTableHead,
    CTableRow,
    CTableHeaderCell,
    CTableBody,
    CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
    cilPencil,
    cilTrash,
    cilPlus,
    cilReload,
    cilGrid,
    cilList,
} from '@coreui/icons'
import { supabase } from '../../lib/supabase'

const Puestos = () => {
    const [puestos, setPuestos] = useState([])
    const [cargando, setCargando] = useState(true)

    // Filtros interactivos de la cuadrícula
    const [filtroEstado, setFiltroEstado] = useState('TODOS') // 'TODOS' | 'LIBRES' | 'OCUPADOS'
    const [filtroColumna, setFiltroColumna] = useState('TODAS') // 'TODAS' | 'A' | 'B' | ...
    const [vistaTabla, setVistaTabla] = useState(false)

    // Modal para crear / editar
    const [modalVisible, setModalVisible] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [guardando, setGuardando] = useState(false)

    const [formData, setFormData] = useState({
        codigo: '',
        tipo: 'AUTOMOVIL',
        estado: 'Disponible',
        ubicacion: 'Sector Principal',
        distancia_cm: '',
    })

    // Obtener puestos desde Supabase
    const fetchPuestos = async () => {
        setCargando(true)
        try {
            const { data, error } = await supabase
                .from('puestos')
                .select('*')
                .order('codigo', { ascending: true })

            if (error) throw error
            setPuestos(data || [])
        } catch (err) {
            alert('Error al cargar puestos: ' + err.message)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        fetchPuestos()
    }, [])

    // Extraer letras de columnas disponibles dinámicamente (A, B, C, D...)
    const columnasDisponibles = useMemo(() => {
        const cols = new Set()
        puestos.forEach((p) => {
            if (p.codigo) {
                const letra = p.codigo.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase()
                if (letra) cols.add(letra)
            }
        })
        return Array.from(cols).sort()
    }, [puestos])

    // Filtrar puestos según botones seleccionados
    const puestosFiltrados = useMemo(() => {
        return puestos.filter((p) => {
            // Filtro de Estado
            const esOcupado = p.estado?.toLowerCase() === 'ocupado'
            if (filtroEstado === 'LIBRES' && esOcupado) return false
            if (filtroEstado === 'OCUPADOS' && !esOcupado) return false

            // Filtro de Columna
            if (filtroColumna !== 'TODAS') {
                const letraPuesto = p.codigo?.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase()
                if (letraPuesto !== filtroColumna) return false
            }

            return true
        })
    }, [puestos, filtroEstado, filtroColumna])

    // Agrupar puestos por columna para el layout visual
    const mapaColumnas = useMemo(() => {
        const mapa = {}
        const colsAVisualizar =
            filtroColumna === 'TODAS'
                ? columnasDisponibles.length > 0
                    ? columnasDisponibles
                    : ['A', 'B', 'C', 'D']
                : [filtroColumna]

        colsAVisualizar.forEach((col) => {
            mapa[col] = puestosFiltrados.filter(
                (p) =>
                    p.codigo?.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() === col,
            )
        })

        return mapa
    }, [puestosFiltrados, filtroColumna, columnasDisponibles])

    // Handlers
    const handleOpenAdd = () => {
        setEditingId(null)
        setFormData({
            codigo: '',
            tipo: 'AUTOMOVIL',
            estado: 'Disponible',
            ubicacion: 'Sector Principal',
            distancia_cm: '',
        })
        setModalVisible(true)
    }

    const handleOpenEdit = (puesto) => {
        setEditingId(puesto.id)
        setFormData({
            codigo: puesto.codigo || '',
            tipo: puesto.tipo || 'AUTOMOVIL',
            estado: puesto.estado || 'Disponible',
            ubicacion: puesto.ubicacion || 'Sector Principal',
            distancia_cm: puesto.distancia_cm ?? '',
        })
        setModalVisible(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setGuardando(true)
        try {
            const payload = {
                ...formData,
                distancia_cm: formData.distancia_cm ? Number(formData.distancia_cm) : null,
            }

            if (editingId) {
                const { error } = await supabase
                    .from('puestos')
                    .update(payload)
                    .eq('id', editingId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('puestos').insert([payload])
                if (error) throw error
            }

            setModalVisible(false)
            fetchPuestos()
        } catch (err) {
            alert('Error al guardar puesto: ' + err.message)
        } finally {
            setGuardando(false)
        }
    }

    const handleDelete = async (id, codigo) => {
        if (window.confirm(`¿Deseas eliminar el puesto ${codigo}?`)) {
            try {
                const { error } = await supabase.from('puestos').delete().eq('id', id)
                if (error) throw error
                fetchPuestos()
            } catch (err) {
                alert('Error al eliminar puesto: ' + err.message)
            }
        }
    }

    return (
        <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <div>
                    <strong>Monitoreo de Puestos en Tiempo Real</strong>
                    <div className="small text-body-secondary">
                        Mapa visual interactivo de disponibilidad
                    </div>
                </div>

                <div className="d-flex gap-2 align-items-center">
                    <CButtonGroup role="group">
                        <CButton
                            color={!vistaTabla ? 'primary' : 'outline-secondary'}
                            onClick={() => setVistaTabla(false)}
                            size="sm"
                        >
                            <CIcon icon={cilGrid} className="me-1" /> Rejilla
                        </CButton>
                        <CButton
                            color={vistaTabla ? 'primary' : 'outline-secondary'}
                            onClick={() => setVistaTabla(true)}
                            size="sm"
                        >
                            <CIcon icon={cilList} className="me-1" /> Tabla
                        </CButton>
                    </CButtonGroup>

                    <CButton
                        color="secondary"
                        variant="outline"
                        onClick={fetchPuestos}
                        disabled={cargando}
                        size="sm"
                    >
                        <CIcon icon={cilReload} />
                    </CButton>

                    <CButton
                        color="success"
                        className="text-white"
                        onClick={handleOpenAdd}
                        size="sm"
                    >
                        <CIcon icon={cilPlus} className="me-1" /> Nuevo Puesto
                    </CButton>
                </div>
            </CCardHeader>

            <CCardBody>
                {/* BARRA SUPERIOR DE FILTROS ESTILO NAVEGACIÓN */}
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-light p-2 rounded-3 border">
                    {/* Filtro por Estado */}
                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold small text-uppercase me-1">Estado:</span>
                        <CButtonGroup role="group" size="sm">
                            <CButton
                                color={filtroEstado === 'TODOS' ? 'dark' : 'outline-dark'}
                                onClick={() => setFiltroEstado('TODOS')}
                            >
                                Todos
                            </CButton>
                            <CButton
                                color={filtroEstado === 'LIBRES' ? 'dark' : 'outline-dark'}
                                onClick={() => setFiltroEstado('LIBRES')}
                            >
                                Libres
                            </CButton>
                            <CButton
                                color={filtroEstado === 'OCUPADOS' ? 'dark' : 'outline-dark'}
                                onClick={() => setFiltroEstado('OCUPADOS')}
                            >
                                Ocupados
                            </CButton>
                        </CButtonGroup>
                    </div>

                    {/* Filtro por Columna */}
                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold small text-uppercase me-1">Columna:</span>
                        <CButtonGroup role="group" size="sm">
                            <CButton
                                color={filtroColumna === 'TODAS' ? 'dark' : 'outline-dark'}
                                onClick={() => setFiltroColumna('TODAS')}
                            >
                                Todas
                            </CButton>
                            {(columnasDisponibles.length > 0
                                ? columnasDisponibles
                                : ['A', 'B', 'C', 'D']
                            ).map((col) => (
                                <CButton
                                    key={col}
                                    color={filtroColumna === col ? 'dark' : 'outline-dark'}
                                    onClick={() => setFiltroColumna(col)}
                                >
                                    {col}
                                </CButton>
                            ))}
                        </CButtonGroup>
                    </div>
                </div>

                {cargando ? (
                    <div className="text-center py-5">
                        <CSpinner color="primary" />
                        <p className="mt-2 text-muted">Cargando estado del parqueadero...</p>
                    </div>
                ) : vistaTabla ? (
                    /* VISTA EN TABLA TRADICIONAL */
                    <CTable align="middle" bordered hover responsive striped>
                        <CTableHead color="dark">
                            <CTableRow>
                                <CTableHeaderCell>Código</CTableHeaderCell>
                                <CTableHeaderCell>Tipo</CTableHeaderCell>
                                <CTableHeaderCell>Ubicación</CTableHeaderCell>
                                <CTableHeaderCell>Estado</CTableHeaderCell>
                                <CTableHeaderCell>Distancia Sensor</CTableHeaderCell>
                                <CTableHeaderCell className="text-center">Acciones</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {puestosFiltrados.length === 0 ? (
                                <CTableRow>
                                    <CTableDataCell colSpan={6} className="text-center py-4">
                                        No hay puestos para mostrar.
                                    </CTableDataCell>
                                </CTableRow>
                            ) : (
                                puestosFiltrados.map((item) => (
                                    <CTableRow key={item.id}>
                                        <CTableDataCell className="fw-bold">{item.codigo}</CTableDataCell>
                                        <CTableDataCell>{item.tipo}</CTableDataCell>
                                        <CTableDataCell>{item.ubicacion}</CTableDataCell>
                                        <CTableDataCell>
                                            <CBadge
                                                color={
                                                    item.estado?.toLowerCase() === 'ocupado'
                                                        ? 'danger'
                                                        : 'success'
                                                }
                                            >
                                                {item.estado}
                                            </CBadge>
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            {item.distancia_cm ? `${item.distancia_cm} cm` : 'N/A'}
                                        </CTableDataCell>
                                        <CTableDataCell className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <CButton
                                                    color="info"
                                                    size="sm"
                                                    className="text-white"
                                                    onClick={() => handleOpenEdit(item)}
                                                >
                                                    <CIcon icon={cilPencil} />
                                                </CButton>
                                                <CButton
                                                    color="danger"
                                                    size="sm"
                                                    className="text-white"
                                                    onClick={() => handleDelete(item.id, item.codigo)}
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
                ) : (
                    /* VISTA EN REJILLA OSCURA ESTILO PLANO DE PARQUEADERO */
                    <div
                        style={{
                            backgroundColor: '#1b1e27',
                            borderRadius: '16px',
                            padding: '24px',
                            color: '#ffffff',
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* LÍNEA DE ENTRADA */}
                        <div className="text-center mb-4">
                            <span
                                style={{
                                    letterSpacing: '4px',
                                    fontSize: '0.85rem',
                                    color: '#8a92a6',
                                    fontWeight: 'bold',
                                }}
                            >
                                ENTRADA ───────────────
                            </span>
                        </div>

                        {/* CONTENEDOR CON SCROLL HORIZONTAL / VERTICAL SI HAY MUCHAS FILAS */}
                        <div
                            style={{
                                maxHeight: '620px',
                                overflowY: 'auto',
                                paddingRight: '8px',
                            }}
                        >
                            <CRow className="g-4 justify-content-center">
                                {Object.keys(mapaColumnas).map((colKey) => (
                                    <CCol key={colKey} xs={12} sm={6} md={3} style={{ minWidth: '200px' }}>
                                        <div
                                            className="text-center fw-bold mb-3 pb-1 border-bottom border-secondary"
                                            style={{ color: '#a0a7b8', letterSpacing: '1px' }}
                                        >
                                            COLUMNA {colKey}
                                        </div>

                                        <div className="d-flex flex-column gap-3">
                                            {mapaColumnas[colKey].length === 0 ? (
                                                <div
                                                    className="text-center p-3 rounded"
                                                    style={{
                                                        backgroundColor: '#232733',
                                                        color: '#5d6679',
                                                        fontSize: '0.85rem',
                                                    }}
                                                >
                                                    Sin puestos
                                                </div>
                                            ) : (
                                                mapaColumnas[colKey].map((puesto) => {
                                                    const esOcupado =
                                                        puesto.estado?.toLowerCase() === 'ocupado'
                                                    const distancia = puesto.distancia_cm
                                                        ? `${puesto.distancia_cm} cm`
                                                        : esOcupado
                                                            ? '32 cm'
                                                            : '165 cm'

                                                    return (
                                                        <div
                                                            key={puesto.id}
                                                            onClick={() => handleOpenEdit(puesto)}
                                                            style={{
                                                                backgroundColor: esOcupado ? '#e55353' : '#252936',
                                                                border: esOcupado
                                                                    ? '1px solid #ff6b6b'
                                                                    : '1px solid #32374a',
                                                                borderRadius: '12px',
                                                                padding: '12px 16px',
                                                                cursor: 'pointer',
                                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                                                color: esOcupado ? '#ffffff' : '#a0a7b8',
                                                            }}
                                                            className="d-flex align-items-center justify-content-between shadow-sm puesto-card"
                                                        >
                                                            <div>
                                                                <div
                                                                    className="fw-bold"
                                                                    style={{
                                                                        fontSize: '1.1rem',
                                                                        color: esOcupado ? '#ffffff' : '#d0d5e0',
                                                                    }}
                                                                >
                                                                    {puesto.codigo}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 'bold',
                                                                        textTransform: 'uppercase',
                                                                        color: esOcupado ? '#ffe0e0' : '#6c757d',
                                                                    }}
                                                                >
                                                                    {esOcupado ? '' : 'LIBRE'}
                                                                </div>
                                                            </div>

                                                            <div className="d-flex align-items-center gap-2">
                                                                {/* Indicador de sensor tipo pastilla */}
                                                                <div
                                                                    style={{
                                                                        backgroundColor: esOcupado
                                                                            ? '#ffffff'
                                                                            : '#1b1e27',
                                                                        color: esOcupado ? '#e55353' : '#8a92a6',
                                                                        padding: '4px 10px',
                                                                        borderRadius: '20px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 'bold',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                                    }}
                                                                    className="d-flex align-items-center gap-1"
                                                                >
                                                                    <span
                                                                        style={{
                                                                            width: '6px',
                                                                            height: '6px',
                                                                            borderRadius: '50%',
                                                                            backgroundColor: esOcupado
                                                                                ? '#e55353'
                                                                                : '#2eb85c',
                                                                            display: 'inline-block',
                                                                        }}
                                                                    />
                                                                    {distancia}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </CCol>
                                ))}
                            </CRow>
                        </div>
                    </div>
                )}
            </CCardBody>

            {/* MODAL CREAR / EDITAR PUESTO */}
            <CModal visible={modalVisible} onClose={() => setModalVisible(false)}>
                <CModalHeader onClose={() => setModalVisible(false)}>
                    <CModalTitle>
                        {editingId ? 'Editar Puesto' : 'Agregar Nuevo Puesto'}
                    </CModalTitle>
                </CModalHeader>
                <CForm onSubmit={handleSubmit}>
                    <CModalBody className="d-flex flex-column gap-3">
                        <div>
                            <label className="form-label fw-semibold">Código del Puesto</label>
                            <CFormInput
                                value={formData.codigo}
                                onChange={(e) =>
                                    setFormData({ ...formData, codigo: e.target.value.toUpperCase() })
                                }
                                placeholder="ej. A01, B03, C05"
                                required
                            />
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Estado</label>
                            <CFormSelect
                                value={formData.estado}
                                onChange={(e) =>
                                    setFormData({ ...formData, estado: e.target.value })
                                }
                            >
                                <option value="Disponible">Disponible (Libre)</option>
                                <option value="Ocupado">Ocupado</option>
                                <option value="Mantenimiento">Mantenimiento</option>
                            </CFormSelect>
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Tipo de Vehículo</label>
                            <CFormSelect
                                value={formData.tipo}
                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                            >
                                <option value="AUTOMOVIL">AUTOMÓVIL</option>
                                <option value="MOTOCICLETA">MOTOCICLETA</option>
                                <option value="PREFERENCIAL">PREFERENCIAL / DISCAPACIDAD</option>
                            </CFormSelect>
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Distancia Sensor (cm)</label>
                            <CFormInput
                                type="number"
                                value={formData.distancia_cm}
                                onChange={(e) =>
                                    setFormData({ ...formData, distancia_cm: e.target.value })
                                }
                                placeholder="ej. 32"
                            />
                        </div>

                        <div>
                            <label className="form-label fw-semibold">Ubicación / Sector</label>
                            <CFormInput
                                value={formData.ubicacion}
                                onChange={(e) =>
                                    setFormData({ ...formData, ubicacion: e.target.value })
                                }
                            />
                        </div>
                    </CModalBody>
                    <CModalFooter className="d-flex justify-content-between">
                        {editingId ? (
                            <CButton
                                color="danger"
                                variant="outline"
                                onClick={() => {
                                    handleDelete(editingId, formData.codigo)
                                    setModalVisible(false)
                                }}
                            >
                                Eliminar
                            </CButton>
                        ) : (
                            <div />
                        )}
                        <div>
                            <CButton
                                color="secondary"
                                className="me-2"
                                onClick={() => setModalVisible(false)}
                            >
                                Cancelar
                            </CButton>
                            <CButton
                                color="success"
                                type="submit"
                                disabled={guardando}
                                className="text-white"
                            >
                                {guardando ? 'Guardando...' : 'Guardar'}
                            </CButton>
                        </div>
                    </CModalFooter>
                </CForm>
            </CModal>
        </CCard>
    )
}

export default Puestos