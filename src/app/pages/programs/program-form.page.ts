import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Program } from 'src/app/models/basic_models.model';
import { ApiService } from 'src/app/services/api.service';
import { SessionService } from 'src/app/services/session.service';
import { AuthService } from 'src/app/services/auth.service';
import { UtilsService } from 'src/app/services/utils.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-program-form',
  templateUrl: './program-form.page.html',
  styleUrls: ['./program-form.page.scss']
})
export class ProgramFormPage implements OnInit, OnDestroy {
  form: FormGroup;
  programs: Program[] = [];
  loadingPrograms = false;
  programsError = false;
  uploadedFile: File | null = null;
  fileUploadError = '';
  private subscriptions = new Subscription();
  @ViewChild('fileInput', { static: false }) fileInput: any;

  readonly textFields = [
    { name: 'name', label: 'Nombre', multiline: false },
    { name: 'shortname', label: 'Nombre corto', multiline: false },
    { name: 'responsable', label: 'Responsable', multiline: true },
    { name: 'responsable_url', label: 'Enlace del responsable', multiline: false },
    { name: 'more_info', label: 'Enlace con más información', multiline: false },
    { name: 'contact', label: 'Contacto', multiline: true },
    { name: 'information', label: 'Información', multiline: true },
    { name: 'reception_conditions', label: 'Condiciones de recepción', multiline: true },
    { name: 'benefits', label: 'Beneficios', multiline: true },
    { name: 'lifecycle', label: 'Ciclo de vida', multiline: true },
    { name: 'receives', label: 'Recibe', multiline: true },
    { name: 'receives_no', label: 'No recibe', multiline: true }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private api: ApiService,
    private session: SessionService,
    private auth: AuthService,
    private utils: UtilsService
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      operation: ['create', Validators.required],
      program_id: [null],
      program: this.formBuilder.group({
        name: ['', Validators.required],
        shortname: [''],
        responsable: [''],
        responsable_url: [''],
        more_info: [''],
        reception_conditions: [''],
        contact: [''],
        information: [''],
        benefits: [''],
        lifecycle: [''],
        receives: [''],
        receives_no: [''],
        country_id: [this.defaultCountryId(), [Validators.required, Validators.pattern('^[12]$')]],
        tag_id: [null, [Validators.min(1), Validators.pattern('^[0-9]+$')]]
      })
    });

    this.subscriptions.add(this.form.get('operation').valueChanges.subscribe(operation => {
      const selected = this.form.get('program_id');
      selected.setValidators(operation === 'update' ? Validators.required : null);
      selected.reset(null, { emitEvent: false });
      selected.updateValueAndValidity({ emitEvent: false });
      this.resetProgram();
      if (operation === 'update' && !this.programs.length && !this.loadingPrograms && !this.programsError) {
        this.loadPrograms();
      }
    }));

    this.subscriptions.add(this.form.get('program_id').valueChanges.subscribe(id => {
      this.resetProgram();
      const program = this.programs.find(item => item.id === id);
      if (program) {
        this.form.get('program').patchValue(program);
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadPrograms() {
    this.loadingPrograms = true;
    this.programsError = false;
    this.subscriptions.add(this.api.loadPrograms().subscribe(
      programs => {
        this.programs = programs;
        this.loadingPrograms = false;
      },
      error => {
        console.error('Error al cargar los programas', error);
        this.loadingPrograms = false;
        this.programsError = true;
      }
    ));
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.value;
    const program = Object.assign({}, values.program);
    this.textFields.forEach(field => {
      if (program[field.name] === '') {
        program[field.name] = null;
      }
    });
    program.country_id = Number(program.country_id);
    program.tag_id = program.tag_id === null || program.tag_id === '' ? null : Number(program.tag_id);
    if (values.operation === 'update') {
      program.id = values.program_id;
    }

    this.submitProgram(values.operation, program);
  }

  private submitProgram(operation: string, program: any) {
    const formattedComment = this.formatProgramData(operation, program);
    
    const reportData = {
      name: (this.auth.user && this.auth.user.name) || 'Usuario',
      email: (this.auth.user && this.auth.user.email) || 'contacto@dondereciclo.uy',
      subject: operation === 'create' ? 'Nuevo programa' : 'Modificación de programa',
      comment: formattedComment,
      id: program.id || 'new'
    };

    if (this.uploadedFile) {
      this.submitProgramWithFile(reportData);
    } else {
      this.submitProgramWithoutFile(reportData);
    }
  }

  private formatProgramData(operation: string, program: any): string {
    const lines: string[] = [];
    lines.push(`Tipo de propuesta: ${operation === 'create' ? 'Nuevo programa' : 'Modificación de programa'}`);
    lines.push('');

    if (operation === 'update' && program.id) {
      lines.push(`ID del programa: ${program.id}`);
      lines.push('');
    }

    this.textFields.forEach(field => {
      const value = program[field.name];
      if (value) {
        const label = field.label;
        lines.push(`${label}: ${value}`);
      }
    });

    lines.push('');
    lines.push(`País: ${program.country_id === 1 ? 'Uruguay' : program.country_id === 2 ? 'Colombia' : program.country_id}`);
    
    if (program.tag_id) {
      lines.push(`Categoría ID: ${program.tag_id}`);
    }

    if (this.uploadedFile) {
      lines.push('');
      lines.push(`Archivo adjunto: ${this.uploadedFile.name}`);
    }

    return lines.join('\n');
  }

  private submitProgramWithFile(reportData: any) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const fileBody = e.target.result;
      const formData = new FormData();
      formData.append('name', reportData.name);
      formData.append('email', reportData.email);
      formData.append('subject', reportData.subject);
      formData.append('comment', reportData.comment);
      formData.append('id', reportData.id);
      formData.append('photo', 'true'); // Hack para reutilizar el endpoint de reportes y que descargue el adjunto
      formData.append('ClientFilename', this.uploadedFile.name);

      this.utils.createProgram(fileBody, formData).subscribe(
        success => {
          if (success) {
            this.form.reset();
            this.clearUploadedFile();
          }
        }
      );
    };
    reader.readAsArrayBuffer(this.uploadedFile);
  }

  private submitProgramWithoutFile(reportData: any) {
    const formData = new FormData();
    formData.append('name', reportData.name);
    formData.append('email', reportData.email);
    formData.append('subject', reportData.subject);
    formData.append('comment', reportData.comment);
    formData.append('id', reportData.id);

    this.utils.createProgram(formData, formData).subscribe(
      success => {
        if (success) {
          this.form.reset();
        }
      }
    );
  }

  private defaultCountryId(): number {
    const country = environment[this.session.country];
    return country && (country.id === 1 || country.id === 2) ? country.id : 1;
  }

  private resetProgram() {
    this.form.get('program').reset({
      name: '',
      shortname: '',
      responsable: '',
      responsable_url: '',
      more_info: '',
      reception_conditions: '',
      contact: '',
      information: '',
      benefits: '',
      lifecycle: '',
      receives: '',
      receives_no: '',
      country_id: this.defaultCountryId(),
      tag_id: null
    });
  }

  downloadTemplate() {
    const link = document.createElement('a');
    link.href = 'assets/programa-contenedores-plantilla.xlsx';
    link.download = 'programa-contenedores-plantilla.xlsx';
    link.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.fileUploadError = '';

    if (!file) {
      this.uploadedFile = null;
      return;
    }

    const fileName = file.name.toLowerCase();
    const isValidFormat = fileName.endsWith('.xlsx') || fileName.endsWith('.csv');

    if (!isValidFormat) {
      this.fileUploadError = 'El archivo debe ser en formato CSV o XLSX.';
      this.uploadedFile = null;
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
      return;
    }

    this.uploadedFile = file;
  }

  clearUploadedFile() {
    this.uploadedFile = null;
    this.fileUploadError = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
