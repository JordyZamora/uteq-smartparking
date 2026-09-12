import React, { useState, useEffect, useMemo } from 'react'
import {
    CCard,
    CCardHeader,
    CCardBody,
    CTable,
    CTableHead,
    CTableRow,
    CTableHeaderCell,
    CTableBody,
    CTableDataCell,
    CButton,
    CBadge,
    CFormInput,
    CSpinner,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CForm,
    CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilReload, cilCheck } from '@coreui/icons'
import { supabase } from '../../lib/supabase'

const RegistrosEstacionamiento = () => {
    const [registros, setRegistros] = useState([])
    const [puestosDisponibles, setPuestosDisponibles] = useState([])
    const [cargando, setCargando] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [modalVisible, setModalVisible] = useState(false)
    const [guardando, setGuardando] = useState(false)

    const [formData, setFormData] = useState({
        placa: '',
        puesto_codigo: '',
        observaciones: '',
    })

    const fetchRegistros = async () => {
        setCargando(true)
        try {
            const { data, error } = await supabase
                .from('registros_estacionamiento')
                .select('*')
                .order('fecha_entrada', { ascending: false })

            if (error) throw error
            setRegistros(data || [])

            // Cargar puestos disponibles para el modal de nueva entrada
            const { data: puestosData } = await supabase
                .from('puestos')
                .select('codigo')
                .eq('estado', 'Disponible')

            setPuestosDisponibles(puestosData || [])
        } catch (err) {
            alert('Error al cargar registros: ' + err.message)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        fetchRegistros()
    }, [])

    const registrosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase()
        if (!texto) return registros
        return registros.filter(
            (r) =>
                r.placa?.toLowerCase().includes(texto) ||
                r.puesto_codigo?.toLowerCase().includes(texto) ||
                r.estado?.toLowerCase().includes(texto),
        )
    }, [registros, busqueda])

    const handleOpenNuevaEntrada = () => {
        setFormData({ placa: '', puesto_codigo: '', observaciones: '' })
        setModalVisible(true)
    }

    const handleRegistrarEntrada = async (e) => {
        e.preventDefault()
        setGuardando(true)
        try {
            // 1. Insertar nuevo registro
            const { error: errorReg } = await supabase
                .from('registros_estacionamiento')
                .insert([
                    {
                        placa: formData.placa.toUpperCase(),
                        puesto_codigo: formData.puesto_codigo,
                        fecha_entrada: new Date().toISOString(),
                        estado: 'En Parqueadero',
                        observaciones: formData.observaciones,
                    },
                ])

            if (errorReg) throw errorReg

            // 2. Cambiar estado del puesto a Ocupado (si aplica)
            if (formData.puesto_codigo) {
                await supabase
                    .from('puestos')
                    .update({ estado: 'Ocupado' })
                    .eq('codigo', formData.puesto_codigo)
            }

            setModalVisible(false)
            fetchRegistros()
        } catch (err) {
            alert('Error al registrar entrada: ' + err.message)
        } finally {
            setGuardando(false)
        }
    }

    const handleMarcarSalida = async (registro) => {
        if (window.confirm(`¿Confirmar salida del vehículo con placa ${registro.placa}?`)) {
            try {
                // 1. Actualizar registro de estacionamiento
                const { error } = await supabase
                    .from('registros_estacionamiento')
                    .update({
                        fecha_salida: new Date().toISOString(),
                        estado: 'Finalizado',
                    })
                    .eq('id', registro.id)

                if (error) throw error

                // 2. Liberar el puesto
                if (registro.puesto_codigo) {
                    await supabase
                        .from('puestos')
                        .update({ estado: 'Disponible' })
                        .eq('codigo', registro.puesto_codigo)
                }

                fetchRegistros()
            } catch (err) {
                alert('Error al registrar salida: ' + err.message)
            }
        }
    }

    return (
        <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <div>
                    <strong>Registros de Estacionamiento</strong>
                    <div className="small text-body-secondary">
                        Historial y monitoreo de entradas y salidas
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <CButton color="secondary" variant="outline" onClick={fetchRegistros} disabled={cargando}>
                        <CIcon icon={cilReload} />
                    </CButton>
                    <CButton color="success" className="text-white" onClick={handleOpenNuevaEntrada}>
                        <CIcon icon={cilPlus} className="me-1" /> Nueva Entrada
                    </CButton>
                </div>
            </CCardHeader>

            <CCardBody>
                <div className="mb-3" style={{ maxWidth: '400px' }}>
                    <CFormInput
                        type="search"
                        placeholder="Buscar por placa, puesto o estado..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {cargando ? (
                    <div className="text-center py-5">
                        <CSpinner color="success" />
                    </div>
                ) : (
                    <CTable align="middle" bordered hover responsive striped>
                        <CTableHead color="dark">
                            <CTableRow>
                                <CTableHeaderCell>Placa</CTableHeaderCell>
                                <CTableHeaderCell>Puesto</CTableHeaderCell>
                                <CTableHeaderCell>Fecha y Hora Entrada</CTableHeaderCell>
                                <CTableHeaderCell>Fecha y Hora Salida</CTableHeaderCell>
                                <CTableHeaderCell>Estado</CTableHeaderCell>
                                <CTableHeaderCell className="text-center">Acción</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {registrosFiltrados.length === 0 ? (
                                <CTableRow>
                                    <CTableDataCell colSpan={6} className="text-center py-4">
                                        Sin registros de estacionamiento.
                                    </CTableDataCell>
                                </CTableRow>
                            ) : (
                                registrosFiltrados.map((item) => (
                                    <CTableRow key={item.id}>
                                        <CTableDataCell>
                                            <CBadge color="dark" className="fs-6">
                                                {item.placa}
                                            </CBadge>
                                        </CTableDataCell>
                                        <CTableDataCell>{item.puesto_codigo || 'N/A'}</CTableDataCell>
                                        <CTableDataCell>
                                            {item.fecha_entrada
                                                ? new Date(item.fecha_entrada).toLocaleString('es-EC')
                                                : '-'}
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            {item.fecha_salida
                                                ? new Date(item.fecha_salida).toLocaleString('es-EC')
                                                : '-'}
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            <CBadge
                                                color={item.estado === 'En Parqueadero' ? 'warning' : 'success'}
                                            >
                                                {item.estado}
                                            </CBadge>
                                        </CTableDataCell>
                                        <CTableDataCell className="text-center">
                                            {item.estado === 'En Parqueadero' && (
                                                <CButton
                                                    color="danger"
                                                    size="sm"
                                                    className="text-white"
                                                    onClick={() => handleMarcarSalida(item)}
                                                >
                                                    <CIcon icon={cilCheck} className="me-1" /> Marcar Salida
                                                </CButton>
                                            )}
                                        </CTableDataCell>
                                    </CTableRow>
                                ))
                            )}
                        </CTableBody>
                    </CTable>
                )}
            </CCardBody>

            <CModal visible={modalVisible} onClose={() => setModalVisible(false)}>
                <CModalHeader onClose={() => setModalVisible(false)}>
                    <CModalTitle>Registrar Entrada Manual</CModalTitle>
                </CModalHeader>
                <CForm onSubmit={handleRegistrarEntrada}>
                    <CModalBody className="d-flex flex-column gap-3">
                        <div>
                            <label className="form-label">Placa del Vehículo</label>
                            <CFormInput
                                value={formData.placa}
                                onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                                placeholder="ej. ABC-1234"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Asignar Puesto Disponible</label>
                            <CFormSelect
                                value={formData.puesto_codigo}
                                onChange={(e) => setFormData({ ...formData, puesto_codigo: e.target.value })}
                            >
                                <option value="">Sin puesto fijo</option>
                                {puestosDisponibles.map((p) => (
                                    <option key={p.codigo} value={p.codigo}>
                                        {p.codigo}
                                    </option>
                                ))}
                            </CFormSelect>
                        </div>
                        <div>
                            <label className="form-label">Observaciones</label>
                            <CFormInput
                                value={formData.observaciones}
                                onChange={(e) =>
                                    setFormData({ ...formData, observaciones: e.target.value })
                                }
                            />
                        </div>
                    </CModalBody>
                    <CModalFooter>
                        <CButton color="secondary" onClick={() => setModalVisible(false)}>
                            Cancelar
                        </CButton>
                        <CButton color="success" type="submit" disabled={guardando} className="text-white">
                            {guardando ? 'Guardando...' : 'Registrar Entrada'}
                        </CButton>
                    </CModalFooter>
                </CForm>
            </CModal>
        </CCard>
    )
}

export default RegistrosEstacionamiento