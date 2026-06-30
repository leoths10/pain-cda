<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Calques documentaires posés sur le plan VTOM.
 * Chaque calque appartient à l'utilisateur LDAP qui l'a créé.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_docs', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_docs');
    }
};
